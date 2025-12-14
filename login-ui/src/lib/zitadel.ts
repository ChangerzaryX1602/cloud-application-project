const ZITADEL_API_URL = process.env.ZITADEL_API_URL || 'https://localhost:8080';

interface ZitadelUser {
  id: string;
  loginName: string;
  displayName?: string;
  email?: string;
}

interface Session {
  sessionId: string;
  sessionToken: string;
  userId?: string;
}

interface SessionPasswordResult {
  success: boolean;
  sessionToken?: string;
}

interface CallbackResult {
  callbackUrl?: string;
}

const ZITADEL_HOST = process.env.ZITADEL_HOST || 'sso.mysterchat.com';

async function zitadelFetch(path: string, token: string, options: RequestInit = {}) {
  const url = `${ZITADEL_API_URL}${path}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-zitadel-forwarded': `host="${ZITADEL_HOST}";proto="https"`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Zitadel API error: ${response.status} - ${error}`);
    throw new Error(`Zitadel API error: ${response.status}`);
  }

  return response.json();
}

export async function searchUser(
  token: string, 
  loginName: string, 
  organization?: string
): Promise<ZitadelUser | null> {
  try {
    const body: any = {
      queries: [
        {
          loginNameQuery: {
            loginName,
            method: 'TEXT_QUERY_METHOD_EQUALS',
          },
        },
      ],
    };

    const data = await zitadelFetch('/v2/users', token, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (data.result && data.result.length > 0) {
      const user = data.result[0];
      return {
        id: user.userId,
        loginName: user.preferredLoginName || loginName,
        displayName: user.human?.profile?.displayName,
        email: user.human?.email?.email,
      };
    }

    return null;
  } catch (error) {
    console.error('Error searching user:', error);
    throw error;
  }
}

export async function createSession(
  token: string,
  loginName: string,
  organization?: string
): Promise<Session> {
  try {
    const body: any = {
      checks: {
        user: {
          loginName,
        },
      },
    };

    const data = await zitadelFetch('/v2/sessions', token, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    // Get session details to get userId
    let userId: string | undefined;
    try {
      const sessionDetails = await zitadelFetch(`/v2/sessions/${data.sessionId}`, token, {
        method: 'GET',
      });
      userId = sessionDetails.session?.factors?.user?.id;
    } catch {
      // Ignore error, userId is optional
    }

    return {
      sessionId: data.sessionId,
      sessionToken: data.sessionToken,
      userId,
    };
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

export async function setSessionPassword(
  token: string,
  sessionId: string,
  sessionToken: string,
  password: string
): Promise<SessionPasswordResult> {
  try {
    const body = {
      sessionToken,
      checks: {
        password: {
          password,
        },
      },
    };

    const data = await zitadelFetch(`/v2/sessions/${sessionId}`, token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    return {
      success: true,
      sessionToken: data.sessionToken,
    };
  } catch (error) {
    console.error('Error verifying password:', error);
    return { success: false };
  }
}

interface SessionDetails {
  sessionId: string;
  factors?: {
    user?: any;
    password?: any;
    webAuthN?: any;
    intent?: any;
    totp?: any;
  };
  needsSecondFactor?: boolean;
  secondFactorType?: 'webauthn' | 'totp' | 'u2f';
}

export async function getSession(
  token: string,
  sessionId: string,
  sessionToken: string
): Promise<SessionDetails | null> {
  try {
    const data = await zitadelFetch(`/v2/sessions/${sessionId}`, token, {
      method: 'GET',
      headers: {
        'x-zitadel-session-token': sessionToken,
      },
    });

    const session = data.session;
    
    // Check if second factor is needed
    // If user has MFA enabled but session doesn't have webAuthN or totp factor
    let needsSecondFactor = false;
    let secondFactorType: 'webauthn' | 'totp' | 'u2f' | undefined;

    // This is simplified - in reality we'd check user settings
    // For now, we check if factors are incomplete
    if (session?.factors?.password && !session?.factors?.webAuthN && !session?.factors?.totp) {
      // Check auth request requirements
      needsSecondFactor = true;
      secondFactorType = 'webauthn'; // Default to webauthn
    }

    return {
      sessionId,
      factors: session?.factors,
      needsSecondFactor,
      secondFactorType,
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

interface WebAuthnChallenge {
  publicKeyCredentialRequestOptions?: any;
  sessionToken?: string;
}

export async function getWebAuthnChallenge(
  token: string,
  sessionId: string,
  sessionToken: string
): Promise<WebAuthnChallenge | null> {
  try {
    const body = {
      sessionToken,
      challenges: {
        webAuthN: {
          domain: 'sso.mysterchat.com',
          userVerificationRequirement: 'USER_VERIFICATION_REQUIREMENT_PREFERRED',
        },
      },
    };

    const data = await zitadelFetch(`/v2/sessions/${sessionId}`, token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    console.log('WebAuthn challenge response:', JSON.stringify(data.challenges, null, 2));

    // The response structure is: challenges.webAuthN.publicKeyCredentialRequestOptions.publicKey
    const options = data.challenges?.webAuthN?.publicKeyCredentialRequestOptions;
    
    // Return the inner publicKey object which is what WebAuthn API needs
    return {
      publicKeyCredentialRequestOptions: options?.publicKey || options,
      sessionToken: data.sessionToken,
    };
  } catch (error) {
    console.error('Error getting WebAuthn challenge:', error);
    return null;
  }
}

export async function verifyWebAuthn(
  token: string,
  sessionId: string,
  sessionToken: string,
  credentialAssertionData: any
): Promise<{ success: boolean; sessionToken?: string }> {
  try {
    const body = {
      sessionToken,
      checks: {
        webAuthN: {
          credentialAssertionData,
        },
      },
    };

    const data = await zitadelFetch(`/v2/sessions/${sessionId}`, token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    return {
      success: true,
      sessionToken: data.sessionToken,
    };
  } catch (error) {
    console.error('Error verifying WebAuthn:', error);
    return { success: false };
  }
}

export async function getAuthRequestCallback(
  token: string,
  authRequestId: string,
  sessionId: string,
  sessionToken: string
): Promise<CallbackResult | null> {
  try {
    const body = {
      session: {
        sessionId,
        sessionToken,
      },
    };

    const data = await zitadelFetch(`/v2/oidc/auth_requests/${authRequestId}`, token, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      callbackUrl: data.callbackUrl,
    };
  } catch (error) {
    console.error('Error getting auth request callback:', error);
    return null;
  }
}

interface AuthRequestDetails {
  id: string;
  needsMFA?: boolean;
  prompt?: string[];
}

export async function getAuthRequest(
  token: string,
  authRequestId: string
): Promise<AuthRequestDetails | null> {
  try {
    const data = await zitadelFetch(`/v2/oidc/auth_requests/${authRequestId}`, token, {
      method: 'GET',
    });

    // Check if MFA is required
    const needsMFA = data.authRequest?.prompt?.includes('MFA') || 
                     data.authRequest?.loginPolicy?.secondFactorCheckLifetime !== '0s' ||
                     data.authRequest?.secondFactors?.length > 0;

    return {
      id: authRequestId,
      needsMFA,
      prompt: data.authRequest?.prompt,
    };
  } catch (error) {
    console.error('Error getting auth request:', error);
    return null;
  }
}

interface CreateUserParams {
  email: string;
  username: string;
  givenName: string;
  familyName: string;
  password: string;
  organization?: string;
}

interface CreateUserResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export async function createUser(
  token: string,
  params: CreateUserParams
): Promise<CreateUserResult> {
  try {
    const body = {
      username: params.username,
      profile: {
        givenName: params.givenName,
        familyName: params.familyName,
        displayName: `${params.givenName} ${params.familyName}`,
      },
      email: {
        email: params.email,
        isVerified: false,
      },
      password: {
        password: params.password,
        changeRequired: false,
      },
    };

    const data = await zitadelFetch('/v2/users/human', token, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return {
      success: true,
      userId: data.userId,
    };
  } catch (error: any) {
    console.error('Error creating user:', error);
    return {
      success: false,
      error: error.message || 'Failed to create user',
    };
  }
}

interface TOTPResult {
  success: boolean;
  sessionToken?: string;
}

export async function verifyTOTP(
  token: string,
  sessionId: string,
  code: string
): Promise<TOTPResult> {
  try {
    const body = {
      checks: {
        totp: {
          code,
        },
      },
    };

    const data = await zitadelFetch(`/v2/sessions/${sessionId}`, token, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    return {
      success: true,
      sessionToken: data.sessionToken,
    };
  } catch (error) {
    console.error('Error verifying TOTP:', error);
    return { success: false };
  }
}

interface UserSecondFactors {
  hasSecondFactor: boolean;
  hasPasskey: boolean;
  hasU2F: boolean;
  hasTOTP: boolean;
}

export async function getUserSecondFactors(
  token: string,
  userId: string
): Promise<UserSecondFactors | null> {
  if (!userId) {
    return null;
  }

  try {
    // Get user's authentication methods using v2beta endpoint
    const authMethods = await zitadelFetch(`/v2beta/users/${userId}/authentication_methods`, token, {
      method: 'GET',
    });

    console.log('Auth methods response:', authMethods);

    const methods = authMethods.authMethodTypes || [];
    const hasPasskey = methods.includes('AUTHENTICATION_METHOD_TYPE_PASSKEY');
    const hasU2F = methods.includes('AUTHENTICATION_METHOD_TYPE_U2F');
    const hasTOTP = methods.includes('AUTHENTICATION_METHOD_TYPE_TOTP') || 
                    methods.includes('AUTHENTICATION_METHOD_TYPE_OTP_SMS') ||
                    methods.includes('AUTHENTICATION_METHOD_TYPE_OTP_EMAIL');

    return {
      hasSecondFactor: hasPasskey || hasU2F || hasTOTP,
      hasPasskey,
      hasU2F,
      hasTOTP,
    };
  } catch (error) {
    console.error('Error getting user second factors:', error);
    return null;
  }
}

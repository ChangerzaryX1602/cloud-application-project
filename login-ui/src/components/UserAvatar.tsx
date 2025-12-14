interface UserAvatarProps {
  loginName: string;
  displayName?: string;
  onBack?: () => void;
}

export function UserAvatar({ loginName, displayName, onBack }: UserAvatarProps) {
  const initials = loginName
    .split('@')[0]
    .split('.')
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      {onBack && (
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          title="กลับ"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}
      <div className="w-10 h-10 bg-gradient-to-br from-kku-primary to-kku-accent rounded-full flex items-center justify-center text-white font-semibold shadow-md">
        {initials || 'U'}
      </div>
      <div className="flex-1 min-w-0">
        {displayName && (
          <p className="font-medium text-gray-800 truncate">{displayName}</p>
        )}
        <p className="text-sm text-gray-500 truncate">{loginName}</p>
      </div>
    </div>
  );
}

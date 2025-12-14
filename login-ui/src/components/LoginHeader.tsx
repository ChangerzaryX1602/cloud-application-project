export function LoginHeader() {
  return (
    <div className="text-center mb-8">
      <div className="w-24 h-24 mx-auto mb-4">
        <img
          src="/ui/v2/login/ENG_KKU_Symbol.svg.png"
          alt="KKU Engineering Logo"
          className="w-full h-full object-contain"
        />
      </div>
      <h1 className="text-2xl font-bold text-gray-800">
        KKU Cloud Application Project
      </h1>
      <p className="text-kku-primary font-medium mt-1">SSO by อาจารย์ชัชชัย</p>
    </div>
  );
}

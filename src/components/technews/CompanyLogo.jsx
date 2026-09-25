import { useState } from "react";

function CompanyLogo({ company, size = 46 }) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={`tn-company-logo ${failed ? "tn-company-logo-fallback" : ""}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {!failed && company.logoUrl ? (
        <img
          src={company.logoUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{company.initials}</span>
      )}
    </div>
  );
}

export default CompanyLogo;

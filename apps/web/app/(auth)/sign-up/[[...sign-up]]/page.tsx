"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const REFERRAL_CODE_KEY = "referral_code";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const urlReferralCode = searchParams.get("ref");
  const [unsafeMetadata, setUnsafeMetadata] = useState<Record<string, any>>({});

  useEffect(() => {
    // Si hay código en la URL, guardarlo en localStorage
    if (urlReferralCode) {
      localStorage.setItem(REFERRAL_CODE_KEY, urlReferralCode);
      setUnsafeMetadata({ referralCode: urlReferralCode });
    } else {
      // Si no hay en la URL, intentar leer de localStorage
      const storedReferralCode = localStorage.getItem(REFERRAL_CODE_KEY);
      if (storedReferralCode) {
        setUnsafeMetadata({ referralCode: storedReferralCode });
      }
    }
  }, [urlReferralCode]);

  const handleAfterSignUp = () => {
    // Limpiar el código de localStorage después del registro exitoso
    localStorage.removeItem(REFERRAL_CODE_KEY);
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
        unsafeMetadata={Object.keys(unsafeMetadata).length > 0 ? unsafeMetadata : undefined}
        afterSignUp={handleAfterSignUp}
      />
    </div>
  );
}


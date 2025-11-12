import { useCallback, useEffect, useState } from "react";

export function useUpdateChecker() {
  const [showUpdateChecker, setShowUpdateChecker] = useState(false);

  const openUpdateChecker = useCallback(() => {
    setShowUpdateChecker(false);
    setTimeout(() => setShowUpdateChecker(true), 10);
  }, []);

  const handleUpdateCheckComplete = useCallback(() => {
    setShowUpdateChecker(false);
  }, []);

  useEffect(() => {
    const handler = () => {
      openUpdateChecker();
    };
    window.addEventListener("worktrace:triggerUpdateCheck", handler);
    if (window.location.search.includes("openUpdate=1")) {
      setTimeout(() => setShowUpdateChecker(true), 10);
    }
    return () => window.removeEventListener("worktrace:triggerUpdateCheck", handler);
  }, [openUpdateChecker]);

  return {
    showUpdateChecker,
    openUpdateChecker,
    handleUpdateCheckComplete,
  } as const;
}

// import { useEffect } from "react";
// import config from '../Apiconfig';

// const AUTO_LOGOUT_MINUTES = 60;

// const useAutoLogout = (logoutFunction) => {

//     useEffect(() => {
//     const fetchIdleTime = async () => {
//       try {
//         const response = await fetch(`${config.apiBaseUrl}/getIdleTime`, {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             company_code: sessionStorage.getItem('selectedCompanyCode'),
//           }),
//         });
//         if (response.ok) {
//           const searchData = await response.json();

//           const [{ Idle_time }] = searchData

//         }
//         else if (response.status = 404) {
//           console.log("Data not found");
//         } else {
//           const errorResponse = await response.json();
//           console.error(errorResponse.message);
//         }
//       } catch (error) {
//         console.error("Error fetching idle time:", error);
//       }
//     };

//     fetchIdleTime();
//   }, []);

//   useEffect(() => {
//     let timer;

//     const resetTimer = () => {
//       clearTimeout(timer);
//       timer = setTimeout(() => {
//         logoutFunction();
//       }, AUTO_LOGOUT_MINUTES * 60 * 1000);
//     };

//     const events = ["mousemove", "keydown", "mousedown", "touchstart"];
//     events.forEach(e => document.addEventListener(e, resetTimer));
//     resetTimer();

//     return () => {
//       clearTimeout(timer);
//       events.forEach(e => document.removeEventListener(e, resetTimer));
//     };
//   }, [logoutFunction]);
// };

// export default useAutoLogout;

// src/hooks/useAutoLogout.js
import { useEffect, useState } from "react";
import config from "../Apiconfig";

const DEFAULT_AUTO_LOGOUT_MINUTES = 60;

const useAutoLogout = (logoutFunction) => {
  const [minutes, setMinutes] = useState(null);

  useEffect(() => {
    const loadIdleTime = async () => {
      const companyCode = sessionStorage.getItem("selectedCompanyCode");
      if (!companyCode) return;

      try {
        const res = await fetch(`${config.apiBaseUrl}/getIdleTime`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company_code: companyCode }),
        });

        const data = await res.json();
        setMinutes(Number(data?.[0]?.Idle_time) || DEFAULT_AUTO_LOGOUT_MINUTES);
      } catch {
        setMinutes(DEFAULT_AUTO_LOGOUT_MINUTES);
      }
    };

    loadIdleTime();
  }, []);

  useEffect(() => {
    if (!minutes) return;

    let timer;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(logoutFunction, minutes * 60 * 1000);
    };

    ["mousemove", "keydown", "mousedown", "touchstart"].forEach(e =>
      document.addEventListener(e, reset)
    );

    reset();

    return () => {
      clearTimeout(timer);
      ["mousemove", "keydown", "mousedown", "touchstart"].forEach(e =>
        document.removeEventListener(e, reset)
      );
    };
  }, [minutes, logoutFunction]);
};

export default useAutoLogout;

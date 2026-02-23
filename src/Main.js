import React from "react";
// import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Home from './Home.js';
import Login from "./Login.js";
import { useState, useEffect } from "react";
import Company from "./Grid.js";
import Input from "./Input.js";
import Topbar from "./Topbar2.js";
import SideBar from "./SideBar.js";
import UserGrid from "./userGrid.js";
import UserInput from "./addUser.js";
import RoleInfoGrid from "./RoleInfoGrid.js";
import Role_input from "./RoleInfo_Input.js";
// import UserRoleMapGrid from "./UserRoleMapGrid.js";
// import UserRoleInput from "./UserRoleMapInput.js";
import Settings from './Settings.js';
import UserScreenMapGrid from "./roleRightsGrid.js";
import UserScreenInput from "./addRoleRights.js";
import NotFound from './NotFound.js';
import AttendanceContracts from "./AttendanceContracts.js";
import AttendanceMachine from "./AttendanceMachine.js";
import AttendanceReport from "./AttendanceReport.js";
import DailyAttendance from "./DailyAttendance.js";
import Employee from "./Employeegrid.js";
import EmployeeInput from "./Employeeinput.js";
import useAutoLogout from "./hooks/useAutoLogout";
import AttriDetGrid from "./AttriDetGrid.js";
import AttriDetInput from "./AttriDetInput.js";
import config from './Apiconfig';
import { closeWebSocket } from './hooks/websocket';
import { initWebSocket } from "./hooks/websocket";
import LeaveMasterGrid from './LeaveMasterGrid.js';
import AddLeaveMaster from './LeaveMasterInput.js';
import CompanyMappingGrid from "./CompanyMappingGrid.js";
import UserComMap_input from "./CompanyMappingInput.js";
import LocInfoGrid from "./LocationInfoGrid.js";
import LocInfoInput from "./LocationInput.js";
import UserRoleMapGrid from "./UserRoleMapGrid.js";
import UserRoleInput from "./UserRoleMapInput.js";

function Main() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [screenTypes, setScreenTypes] = useState(
    JSON.parse(sessionStorage.getItem("screenTypes")) || []
  );

  useEffect(() => {
    const loadPermissions = () => {
      const permissionsJSON = sessionStorage.getItem("permissions");
      if (permissionsJSON) {
        const permissions = JSON.parse(permissionsJSON);
        const screens = permissions.map((permission) =>
          permission.screen_type.replace(/\s+/g, "")
        );
        setScreenTypes(screens);
        sessionStorage.setItem("screenTypes", JSON.stringify(screens));
      }
    };

    loadPermissions();

    window.addEventListener("permissionsUpdated", loadPermissions);
    return () => window.removeEventListener("permissionsUpdated", loadPermissions);
  }, []);

  /* ===============================
    INIT WEBSOCKET
  ================================ */
  useEffect(() => {
    const user_code = sessionStorage.getItem("user_code");
    if (user_code) {
      initWebSocket(user_code); 
    }
  }, []);

  /* ===============================
    LOGOUT FUNCTION
  ================================ */
  const handleLogout = async () => {
    try {
      const userCode = sessionStorage.getItem("user_code");

      if (userCode) {
        await fetch(`${config.apiBaseUrl}/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_code: userCode }),
        });
      }

      localStorage.clear();
      sessionStorage.clear();

      // Prevent back navigation cache
      // window.history.pushState(null, "", window.location.href);
      // window.onpopstate = function () {
      //   window.history.go(1);
      // };
      closeWebSocket();
      navigate("/Login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  /* ===============================
    AUTO LOGOUT (IDLE)
  ================================ */
  useAutoLogout(handleLogout);

  // Logout on tab/window close
  // useEffect(() => {
  //   const handleBeforeUnload = (e) => {
  //     handleLogout();
  //   };
  //   window.addEventListener("beforeunload", handleBeforeUnload);
  //   return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  // }, []);

  /* ===============================
     REFRESH DETECTION
  ================================ */
  useEffect(() => {
    const markRefresh = () => {
      sessionStorage.setItem("isRefreshing", "true");
    };

    window.addEventListener("keydown", (e) => {
      if (e.key === "F5" || (e.ctrlKey && e.key === "r")) {
        markRefresh();
      }
    });

    window.addEventListener("beforeunload", markRefresh);

    return () => {
      window.removeEventListener("beforeunload", markRefresh);
    };
  }, []);

  /* ===============================
     TAB CLOSE LOGOUT ONLY
  ================================ */
  useEffect(() => {
    const handleUnload = () => {
      const isRefreshing = sessionStorage.getItem("isRefreshing");
      const userCode = sessionStorage.getItem("user_code");

      // ✅ TAB CLOSE ONLY
      if (!isRefreshing && userCode) {
        navigator.sendBeacon(
          `${config.apiBaseUrl}/logout`,
          JSON.stringify({ user_code: userCode })
        );
      }

      sessionStorage.removeItem("isRefreshing");
    };

    window.addEventListener("unload", handleUnload);
    return () => window.removeEventListener("unload", handleUnload);
  }, []);

  /* ===============================
     CLEAR REFRESH FLAG AFTER LOAD
  ================================ */
  useEffect(() => {
    sessionStorage.removeItem("isRefreshing");
  }, []);

  // const screenTypes = Object.keys(permissions);

  // create by pavun on 7 may 2024 use: To block the view page source  brgin
  // useEffect(()=>{
  //   document.addEventListener("contextmenu",handlecontextmenu)
  //   return()=>{
  //     document.removeEventListener("contextmenu",handlecontextmenu)
  //   }
  // },[])

  // const handlecontextmenu=(e)=>{
  //   e.preventDefault()
  //   // alert("right click is disable")
  // }
  // create by pavun on 7 may 2024 use: To block the view page source  End

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const routes = [
    { path: "/", component: <Home /> },
    { path: "/Login", component: <Login /> },
    { path: "/Settings", component: <Settings /> },
    { path: "/Company", component: <Company /> },
    { path: "/AddCompany", component: <Input /> },
    { path: "/AddUser", component: <UserInput /> },
    { path: "/User", component: <UserGrid /> },
    { path: "/Role", component: <RoleInfoGrid /> },
    { path: "/AddRole", component: <Role_input /> },
    // { path: "/UserRoleMapping", component: <UserRoleMapGrid /> },
    // { path: "/AddUserRoleMapping", component: <UserRoleInput /> },
    { path: "/RoleRights", component: <UserScreenMapGrid /> },
    { path: "/AddRoleRights", component: <UserScreenInput /> },
    { path: "/NotFound", component: <NotFound /> },
    { path: "/AttenContracts", component: <AttendanceContracts /> },
    { path: "/AttenMachine", component: <AttendanceMachine /> },
    { path: "/AttenReport", component: <AttendanceReport /> },
    { path: "/DailyAttendance", component: <DailyAttendance /> },
    { path: "/EmployeeInfo", component: <Employee /> },
    { path: "/EmployeeInputInfo", component: <EmployeeInput /> },
    { path: "/Attribute", component: <AttriDetGrid /> },
    { path: "/AddAttributeDetail", component: <AttriDetInput /> },
    { path: "/LeaveMasterGrid", component: <LeaveMasterGrid /> },
    { path: "/AddLeaveMaster", component: <AddLeaveMaster /> },
    { path: "/CompanyMapping", component: <CompanyMappingGrid /> },
    { path: "/AddCompanyMapping", component: <UserComMap_input /> },
    { path: "/Location", component: <LocInfoGrid /> },
    { path: "/AddLocation", component: <LocInfoInput /> },
    { path: "/UserRoleMapping", component: <UserRoleMapGrid /> },
    { path: "/AddUserRoleMapping", component: <UserRoleInput /> },
  ];

  return (
    <>
      <PathLogger />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Login" element={<Login />} />

        {routes.map(({ path, component }) =>
          screenTypes.includes(path.replace('/', '')) ? (
            path.includes('Print') ? (
              // Render the component directly without the sidebar and topbar
              <Route
                key={path}
                path={path}
                element={
                  <div className="px-4">{component}</div>
                }
              />
            ) : (
              // Render with sidebar and topbar
              <Route
                key={path}
                path={path}
                element={
                  <div>
                    <Topbar />
                    <div className="layout-container">
                      <SideBar className="sidebar" />
                      <div className="container-fluid ">{component}</div>
                    </div>
                  </div>
                }
              />
            )
          ) : (
            // Render NotFound component if path doesn't match screenTypes
            <Route
              key={path}
              path={path}
              element={
                <div>
                  <SideBar className="sidebar" />
                  <Topbar />
                  <div className="layout-container">
                    <div className="container-fluid ">
                      <NotFound />
                    </div>
                  </div>
                </div>
              }
            />
          )
        )}
      </Routes>
    </>
  );
}

const PathLogger = () => {
  const location = useLocation();

  useEffect(() => {
    const currentPath = location.pathname;

    sessionStorage.setItem('currentPath', currentPath);
  }, [location]);

  return null;
};

export default Main;

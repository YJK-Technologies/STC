import './Topbar2.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import logo from './main.png'
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ThemeProvider } from './ThemeContext';
import ThemeSwitcherVertical from './ThemeSwitcherVertical';
// import { closeWebSocket } from './hooks/websocket';
const config = require('./Apiconfig');


const TopBar = () => {
  const user_code = sessionStorage.getItem('selectedUserCode');
  const [selectedImage, setSelectedImage] = useState(null);
  const userImageBase64 = sessionStorage.getItem('user_image');
  const userImageSrc = userImageBase64 ? `data:image/png;base64,${userImageBase64}` : null;
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState(sessionStorage.getItem('selectedCompanyName') || '');
  const [locationName, setLocationName] = useState(sessionStorage.getItem('selectedLocationName') || '');

  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
      navigate('/Login', { replace: true });
    }
  }, [navigate]);

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
      window.history.pushState(null, "", window.location.href);
      window.onpopstate = function () {
        window.history.go(1);
      };
      // closeWebSocket();
      navigate("/Login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    const disableBackNavigation = () => {
      window.history.pushState(null, null, window.location.href);
    };

    disableBackNavigation();
    window.addEventListener('popstate', disableBackNavigation);

    return () => {
      window.removeEventListener('popstate', disableBackNavigation);
    };
  }, []);


  const handlesetting = () => {
    navigate("/Settings")
  }


  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const maxSize = 1 * 1024 * 1024;

      if (file.size > maxSize) {
        Swal.fire({
          icon: 'error',
          title: 'File Too Large',
          text: 'File size exceeds 1MB. Please upload a smaller file.',
          confirmButtonText: 'OK'
        });
        return;
      }

      if (file) {
        Swal.fire({
          title: 'Do you want to change your profile picture?',
          text: "You selected a new image. Do you want to save it?",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Yes, change it!'
        }).then((result) => {
          if (result.isConfirmed) {
            setSelectedImage(file);
            handleSaveImage(file);
            handleInsert(file);
          } else {
            e.target.value = null;
          }
        });
      }
    }
  };
  const handleSaveImage = (file) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        sessionStorage.setItem('user_image', reader.result.split(',')[1]);
        setSelectedImage(null);

        Swal.fire(
          'Changed!',
          'Your profile picture has been updated.',
          'success'
        );
      };
      reader.readAsDataURL(file);
    }
  };
  const handleInsert = async (file) => {

    try {
      const formData = new FormData();
      formData.append("user_code", user_code);
      if (file) {
        formData.append("user_img", file);
      }

      const response = await fetch(`${config.apiBaseUrl}/UpdateUserImage`, {
        method: "POST",
        body: formData,
      });

      if (response.status === 200) {
        console.log("Data inserted successfully");
        setTimeout(() => {
          Swal.fire({
            title: "Success",
            text: "Data inserted successfully!",
            icon: "success",
            timer: 1000,
            timerProgressBar: true,
            showConfirmButton: false
          })
        }, 1000);
      } else if (response.status === 400) {
        const errorResponse = await response.json();
        console.error(errorResponse.message);
        Swal.fire({
          title: 'Error!',
          text: errorResponse.message,
          icon: 'error',
          timer: 1000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      } else {
        console.error("Failed to insert data");
        Swal.fire({
          title: 'Error!',
          text: 'Failed to insert data',
          icon: 'error',
          timer: 1000,
          timerProgressBar: true,
          showConfirmButton: false
        });
      }
    } catch (error) {
      console.error("Error inserting data:", error);
      Swal.fire({
        title: 'Error!',
        text: 'Error inserting data: ' + error.message,
        icon: 'error',
        timer: 1000,
        timerProgressBar: true,
        showConfirmButton: false
      });
    }
  };


  useEffect(() => {
    const handleStorageChange = () => {
      console.log('sessionStorage has changed!');
      setCompanyName(sessionStorage.getItem('selectedCompanyName') || '');
      setLocationName(sessionStorage.getItem('selectedLocationName') || '');
    };

    // Window-level event listener to detect changes in sessionStorage
    window.addEventListener('storageUpdate', handleStorageChange);

    // Cleanup the event listener
    return () => {
      window.removeEventListener('storageUpdate', handleStorageChange);
    };
  }, []);


  return (
    <nav className="navbar navbar-expand navbar-dark bg-dark Topnav  ">
      <div className=" Topnav-content container-fluid">
        <div className='purbut'>
          <a className="navbar-brand d-flex align-items-center">
            <img src={logo} alt="Logo" width="40" height="40" className="d-inline-block align-top logo-img" />
            {/* <b>
              <sub>
                <sub>
                  <i>
                    <font size="3" color="#D9B466">erp</font>
                  </i>
                </sub>
              </sub>
            </b> */}
          </a></div>
        <div className='mobileview'>
          <a className="navbar-brand d-flex align-items-center">
            <img src={logo} alt="Logo" width="30" height="30" className="d-inline-block align-top logo-img" />
            {/* <b>
              <sub>
                <sub>
                  <i>
                    <font size="1" color="#D9B466">erp</font>
                  </i>
                </sub>
              </sub>
            </b> */}
          </a>
        </div>
        <div className="d-flex justify-content-end mt-0 mb-2" id="navbarSupportedContent">
          <form className="purbut">
            <div className="input-group">
              <p className="companyname">
                {companyName}<br />
                <span className="justify-content-center">{locationName}</span>
              </p>
            </div>
          </form>
          <form className="mobileview">
            <div className="input-group">
              <p style={{ color: "#D9B466", fontSize: "10px" }} className="mt-2 text-warning fw-bold">
                {sessionStorage.getItem('selectedShortName')}<br />
                <span className="justify-content-center">{locationName}</span>
              </p>
            </div>
          </form>
          <ul className="navbar-nav">
            <div className='purbut'>
              <li className="nav-item p-1 mt-1">
                <p className="text-white" >
                  Welcome {user_code}
                </p>
              </li>
            </div>
            <div className='mobileview'>
              <li className="nav-item mt-3">
                <p className="text-white text-center" style={{ fontSize: "11px" }}>
                  Welcome,{user_code}
                </p>
              </li>
            </div>
            <li className="nav-item dropdown mt-1">
              <a
                className="nav-link dropdown-toggle d-flex align-items-center gap-2"
                href="#"
                id="navbarDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                {userImageSrc ? (
                  <img
                    src={userImageSrc}
                    alt="User Avatar"
                    width="35"
                    height="35"
                    className=" rounded-circle position-relative"
                    title={user_code}
                  />
                ) : (
                  <div
                    className="avatar-placeholder rounded-circle position-relative"
                    title={user_code}
                  >
                    {user_code ? user_code.charAt(0) : 'U'}
                  </div>
                )}
              </a>
              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
                <li style={{ cursor: "pointer" }}>
                  <a className="dropdown-item" onClick={handlesetting}>Settings</a>
                </li>
                <li>
                  <label className="dropdown-item" style={{ cursor: "pointer" }}>
                    Change Profile Picture
                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  </label>
                </li>
                {selectedImage && (
                  <li style={{ cursor: "pointer" }}>
                    <button className="dropdown-item" onClick={handleSaveImage}>
                      Save Image
                    </button>
                  </li>
                )}
                <li style={{ cursor: "pointer" }}>
                  <a className="dropdown-item" onClick={handleLogout}>Logout</a>
                </li>
              </ul>
            </li>
          </ul>
          <div className='purbut'>
            <div className="dropdown mt-3 me-2 ms-3">
              <icon
                className="icon text-white dropdown-toggle"
                type="button"
                id="dropdownMenuButton"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-droplet-fill" viewBox="0 0 16 16">
                  <path d="M8 16a6 6 0 0 0 6-6c0-1.655-1.122-2.904-2.432-4.362C10.254 4.176 8.75 2.503 8 0c0 0-6 5.686-6 10a6 6 0 0 0 6 6M6.646 4.646l.708.708c-.29.29-1.128 1.311-1.907 2.87l-.894-.448c.82-1.641 1.717-2.753 2.093-3.13" />
                </svg>
              </icon>
              <ul className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                <ThemeProvider>
                  <ThemeSwitcherVertical />
                </ThemeProvider>
              </ul>
            </div>
          </div>
          <div className='mobileview'>
            <div className="dropdown mt-4 me-3">
              <icon
                className="icon text-white dropdown-toggle"
                type="button"
                id="dropdownMenuButton"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-droplet-fill" viewBox="0 0 16 16">
                  <path d="M8 16a6 6 0 0 0 6-6c0-1.655-1.122-2.904-2.432-4.362C10.254 4.176 8.75 2.503 8 0c0 0-6 5.686-6 10a6 6 0 0 0 6 6M6.646 4.646l.708.708c-.29.29-1.128 1.311-1.907 2.87l-.894-.448c.82-1.641 1.717-2.753 2.093-3.13" />
                </svg>
              </icon>
              <ul className="dropdown-menu" aria-labelledby="dropdownMenuButton">
                <ThemeProvider>
                  <ThemeSwitcherVertical />
                </ThemeProvider>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopBar;

import { useState, useEffect, useCallback, useRef } from "react";
import * as React from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
// import "ag-grid-enterprise";
import "ag-grid-autocomplete-editor/dist/main.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import Select from "react-select";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const config = require("./Apiconfig");

const columnDefs = [
  {
    headerName: "DEPARTMENTCD",
    field: "DEPARTMENTCD",
    editable: false,
    minWidth: 250,
  },
  {
    headerName: "DEPARTMENTDS",
    field: "DEPARTMENTDS",
    editable: false,
    minWidth: 135,
  },
];

const defaultColDef = {
  sortable: true,
  editable: true,
  flex: 1,
  filter: true,
};

export default function ContractorPopup({
  open,
  handleClose,
  handleDepartmentData,
}) {
  const [rowData, setRowData] = useState([]);
  const [selectedValue, setSelectedValue] = useState("DEPARTMENTCD");
  const [fetchTrigger, setFetchTrigger] = useState(false);
  const [gridApi, setGridApi] = useState(null);
  const [gridColumnApi, setGridColumnApi] = useState(null);
  const [selectedDEPARTMENTCD, setSelectedDEPARTMENTCD] = useState("");
  const [selectedDEPARTMENTDS, setSelectedDEPARTMENTDS] = useState("");
  const [uniqueDEPARTMENTCD, setUniqueDEPARTMENTCD] = useState([]);
  const [uniqueDEPARTMENTDS, setUniqueDEPARTMENTDS] = useState([]);
  const [filterValue, setFilterValue] = useState("");
  const gridRef = useRef(null);

  const fetchData = async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/GetDeptCode`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const searchData = await response.json();
        setRowData(searchData);
        const uniqueDEPARTMENTCD = [
          ...new Set(searchData.map((item) => item.DEPARTMENTCD)),
        ];
        const uniqueDEPARTMENTDS = [
          ...new Set(searchData.map((item) => item.DEPARTMENTDS)),
        ];
        setUniqueDEPARTMENTCD(uniqueDEPARTMENTCD);
        setUniqueDEPARTMENTDS(uniqueDEPARTMENTDS);
        console.log("Data fetched successfully:", searchData);
      } else if (response.status === 404) {
        toast.warning("Data not found");
        setRowData([]);
        console.log("Data not found");
      } else {
        console.log("Bad request");
      }
    } catch (error) {
      console.error("Error fetching search data:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchTrigger]);

  const onGridReady = (params) => {
    setGridApi(params.api);
    setGridColumnApi(params.columnApi);
  };

  const handleFilterDEPARTMENTCD = (event) => {
    if (event.key === "Enter" && gridApi) {
      gridApi.setQuickFilter(selectedDEPARTMENTCD);
    }
  };

  const handleFilterDEPARTMENTDS = (event) => {
    if (event.key === "Enter" && gridApi) {
      gridApi.setQuickFilter(selectedDEPARTMENTDS);
    }
  };

  const handleReload = () => {
    setSelectedDEPARTMENTCD("");
    setSelectedDEPARTMENTDS("");
    setFilterValue("");

    if (gridRef.current?.api) {
      gridRef.current.api.setFilterModel(null);
      gridRef.current.api.setQuickFilter("");
    }

    setFetchTrigger((prev) => !prev);
  };
  const handleConfirm = (params) => {
    const selectedData = [
      {
        DEPARTMENTCD: params.data.DEPARTMENTCD,
      },
    ];

    handleDepartmentData(selectedData);
    handleClose();
  };

  const onFilterChange = (e) => {
    setFilterValue(e.target.value);
  };

  const onEnterPress = (e) => {
    if (e.key === "Enter" && gridRef.current) {
      gridRef.current.api.setFilterModel({
        [selectedValue]: {
          type: "contains",
          filter: filterValue,
        },
      });
      gridRef.current.api.onFilterChanged();
    }
  };

  return (
    <div>
      {open && (
        <fieldset>
          <div>
            <div className="">
              <div
                className="modal mt-5 Topnav-screen popup popupadj"
                tabIndex="-1"
                role="dialog"
                style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
              >
                <div className="modal-dialog modal-xl ps-5 p-1" role="document">
                  <div className="modal-content">
                    <div class="row justify-content-center">
                      <div class="col-md-12 text-center">
                        <div className="p-0 bg-body-tertiary">
                          <div className=" mb-0 d-flex justify-content-between">
                            <h1 align="left" className="">
                              Department Help
                            </h1>
                            <button
                              onClick={handleClose}
                              className=" btn btn-danger shadow-none rounded-0 h-70 fs-5"
                              required
                              title="Close"
                            >
                              <i class="fa-solid fa-xmark"></i>
                            </button>
                          </div>
                          <div class="d-flex justify-content-between">
                            <div className="d-flex justify-content-start"></div>
                          </div>
                        </div>
                      </div>
                      <div className="modal-body">
                        <div className="row ms-3 me-3">
                          <div className="col-md-4 mb-2">
                            <select
                              id="transaction_no"
                              className="exp-input-field form-control"
                              value={selectedValue}
                              onChange={(e) => setSelectedValue(e.target.value)}
                            >
                              <option value="CompId">DEPARTMENTCD</option>
                              <option value="CompanyName">DEPARTMENTDS</option>
                            </select>
                          </div>
                          <div className="col-md-5 mb-2">
                            <input
                              type="text"
                              className="exp-input-field form-control"
                              placeholder={selectedValue}
                              value={filterValue}
                              onChange={onFilterChange}
                              onKeyDown={onEnterPress}
                              autoComplete="off"
                            />
                          </div>
                        </div>
                        <div className="row ms-3 me-3 align-items-end">
                          <div className="col-md-3 mb-2">
                            <Select
                              className="exp-input-field"
                              value={
                                selectedDEPARTMENTCD
                                  ? {
                                      value: selectedDEPARTMENTCD,
                                      label: selectedDEPARTMENTCD,
                                    }
                                  : null
                              }
                              onChange={(selectedOption) =>
                                setSelectedDEPARTMENTCD(
                                  selectedOption ? selectedOption.value : "",
                                )
                              }
                              onKeyDown={handleFilterDEPARTMENTCD}
                              options={uniqueDEPARTMENTCD.map((emp) => ({
                                value: emp,
                                label: emp,
                              }))}
                              placeholder="Select CompId"
                            />
                          </div>
                          <div className="col-md-3 mb-2">
                            <Select
                              className="exp-input-field"
                              placeholder="Select Empds"
                              value={
                                selectedDEPARTMENTDS
                                  ? {
                                      value: selectedDEPARTMENTDS,
                                      label: selectedDEPARTMENTDS,
                                    }
                                  : null
                              }
                              onChange={(selectedOption) =>
                                setSelectedDEPARTMENTDS(
                                  selectedOption ? selectedOption.value : "",
                                )
                              }
                              onKeyDown={handleFilterDEPARTMENTDS}
                              options={uniqueDEPARTMENTDS.map((emp) => ({
                                value: emp,
                                label: emp,
                              }))}
                            />
                          </div>
                          <div className="col-md-auto d-flex">
                            <icon
                              className="icon popups-btn"
                              onClick={() => setFetchTrigger((prev) => !prev)}
                              title="Search"
                            >
                              <FontAwesomeIcon icon={faMagnifyingGlass} />
                            </icon>

                            <icon
                              className="icon popups-btn ms-2"
                              onClick={handleReload}
                              title="Reload"
                            >
                              <i className="fa-solid fa-arrow-rotate-right"></i>
                            </icon>
                          </div>
                        </div>

                        <div
                          className="ag-theme-alpine"
                          style={{ height: "400px", width: "100%" }}
                        >
                          <AgGridReact
                            ref={gridRef}
                            rowData={rowData}
                            columnDefs={columnDefs}
                            defaultColDef={defaultColDef}
                            onGridReady={onGridReady}
                            onRowDoubleClicked={handleConfirm}
                            rowHeight={30}
                            headerHeight={30}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </fieldset>
      )}
    </div>
  );
}

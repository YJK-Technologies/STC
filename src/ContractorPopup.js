import { useState, useEffect, useCallback, useRef } from "react";
import * as React from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
// import "ag-grid-enterprise";
import 'ag-grid-autocomplete-editor/dist/main.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'
import Select from 'react-select';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const config = require('./Apiconfig');

const columnDefs = [
  {
    headerName: "contractorname",
    field: "contractorname",
    editable: false,
    minWidth: 250,
  },
  {
    headerName: "contractorname1",
    field: "contractorname1",
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

export default function ContractorPopup({ open, handleClose, handleContractorData }) {

  const [rowData, setRowData] = useState([]);
  const [selectedValue, setSelectedValue] = useState("contractorname");
  const [fetchTrigger, setFetchTrigger] = useState(false);
  const [gridApi, setGridApi] = useState(null);
  const [gridColumnApi, setGridColumnApi] = useState(null);
  const [selectedcontractorname, setSelectedcontractorname] = useState("");
  const [selectedcontractorname1, setSelectedcontractorname1] = useState("");
  const [uniquecontractorname, setUniquecontractorname] = useState([]);
  const [uniquecontractorname1, setUniquecontractorname1] = useState([]);
  const [filterValue, setFilterValue] = useState("");
  const gridRef = useRef(null);

  const fetchData = async () => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/getcontractorname`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const searchData = await response.json();
        const formattedData = searchData.map(item => ({
            contractorname: item.contractorname[0] || "", 
            contractorname1: item.contractorname[1] || ""
          }));
  
        setRowData(formattedData);

        const uniquecontractorname = [...new Set(searchData.map((item) => item.contractorname[0]))];
        const uniquecontractorname1 = [...new Set(searchData.map((item) => item.contractorname[0]))];
        setUniquecontractorname(uniquecontractorname);
        setUniquecontractorname1(uniquecontractorname1);
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

  const handleFiltercontractorname = (event) => {
    if (event.key === "Enter" && gridApi) {
      gridApi.setQuickFilter(selectedcontractorname);
    }
  };

  const handleFiltercontractorname1 = (event) => {
    if (event.key === "Enter" && gridApi) {
      gridApi.setQuickFilter(selectedcontractorname1);
    }
  };

  const handleConfirm = (params) => {
    const selectedData = [{
      contractorname: params.data.contractorname,
    }];
  
    handleContractorData(selectedData);
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
              <div className="modal mt-5 Topnav-screen popup popupadj" tabIndex="-1" role="dialog" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="modal-dialog modal-xl p-1" role="document">
                  <div className="modal-content">
                    <div class="row justify-content-center">
                      <div class="col-md-12 text-center">
                        <div className="p-0 bg-body-tertiary">
                          <div className=" mb-0 d-flex justify-content-between" >
                            <h1 align="left" className="">Contractor Help</h1>
                            <button onClick={handleClose} className=" btn btn-danger shadow-none rounded-0 h-70 fs-5" required title="Close">
                              <i class="fa-solid fa-xmark"></i>
                            </button>
                          </div>
                          <div class="d-flex justify-content-between">
                            <div className="d-flex justify-content-start">
                            </div>
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
                              <option value="contractorname">contractorname</option>
                              <option value="contractorname1">contractorname1</option>
                            </select>
                          </div>
                          <div className="col-md-5 mb-2">
                            <input
                              type='text'
                              className='exp-input-field form-control'
                              placeholder= {selectedValue} // ✅ Dynamic placeholder
                              value={filterValue}
                              onChange={onFilterChange}
                              onKeyDown={onEnterPress}
                              autoComplete='off'
                            />
                          </div>
                        </div>
                        <div className="row ms-3 me-3">
                          <div className="col-md-3 mb-2">
                            <Select
                              className="exp-input-field"
                              isClearable
                              value={selectedcontractorname ? { value: selectedcontractorname, label: selectedcontractorname } : null}
                              onChange={(selectedOption) => setSelectedcontractorname(selectedOption ? selectedOption.value : "")}
                              onKeyDown={handleFiltercontractorname}
                              options={uniquecontractorname.map((emp) => ({
                                value: emp,
                                label: emp,
                              }))}
                              placeholder="Select Empcd"
                            />
                          </div>
                          <div className="col-md-3 mb-2">
                            <Select
                              className='exp-input-field'
                              placeholder='Select Empds'
                              isClearable
                              value={selectedcontractorname1 ? { value: selectedcontractorname1, label: selectedcontractorname1 } : null}
                              onChange={(selectedOption) => setSelectedcontractorname1(selectedOption ? selectedOption.value : "")}
                              onKeyDown={handleFiltercontractorname1}
                              options={uniquecontractorname1.map((emp) => ({
                                value: emp,
                                label: emp,
                              }))}
                            />
                          </div>
                          <div className="col-md-3 mb-2">
                          <icon className="icon popups-btn" onClick={() => setFetchTrigger(prev => !prev)} title="Search">
                            <FontAwesomeIcon icon={faMagnifyingGlass} />
                          </icon>
                          </div>
                        </div>

                        <div className="ag-theme-alpine" style={{ height: '400px', width: '100%' }}>
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

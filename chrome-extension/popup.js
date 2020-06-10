const DEBUG = false;

chrome.storage.local.get({ case_ids: [] }, result => {
	let caseIds = result.case_ids;
	if(caseIds.length > 0){
		fetchCaseIdStatus(caseIds, 0);
	}
});

var fetchCaseIdStatus = (receiptNos, counter) => {
	var currentStatus = "";
	const url = "https://egov.uscis.gov/casestatus/caseStatusSearch.do?multiFormAappReceiptNum=" + receiptNos[counter];
	var xhr = new XMLHttpRequest();

	xhr.onload = function() {
		var currentStatusSectionText = this.responseXML.body.getElementsByClassName("current-status-sec")[0].textContent;
		var appointmentSectionText = this.responseXML.body.getElementsByClassName("appointment-sec")[0].textContent;

		currentStatus = chrome.extension.getBackgroundPage().processCurrentStatus(currentStatusSectionText);
		var details = chrome.extension.getBackgroundPage().processAppointmentSection(appointmentSectionText, currentStatus);

		Logger.log("EAC" + receiptNos[counter] + " : " + currentStatus);
		Logger.log(details);

		appendCaseStatus(receiptNos[counter] + " : " + currentStatus, details);

		counter = counter + 1;
		if (counter < receiptNos.length) {
			setTimeout(fetchCaseIdStatus, 1000, receiptNos, counter);
		}
	}

	xhr.open("GET", url);
	xhr.responseType = "document";
	xhr.send();
};

var appendCaseStatus = function(currentStatus, details) {
	var p = document.createElement("p");
	var spanStatus = document.createElement("span");
	spanStatus.innerHTML = currentStatus;
	var spanDetails = document.createElement("span");
	spanDetails.innerHTML = details;
	p.append(spanStatus);
	p.append(spanDetails);
	let resultDiv = document.getElementById("result");
	resultDiv.append(p);
}

let addButton = document.getElementById("case_id_add");
addButton.addEventListener('click', ()=>{
	let caseInput = document.getElementById("case_id");
	var case_id = caseInput.value;
	caseInput.value = "";
	chrome.storage.local.get({case_ids: []}, (result)=>{
		let caseIds = result.case_ids;
		caseIds.push(case_id);
		chrome.storage.local.set({case_ids: caseIds}, ()=>{
			console.log('Value is set to ' + caseIds);
		});
	});
});

// Clear All functionalities
let clearAllButton = document.getElementById("clear_all");
clearAllButton.addEventListener('click', ()=>{
	chrome.storage.local.remove("case_ids", () =>{
		console.log("Case Ids has been cleared.")
	});
});

var Logger = {};
Logger.log = message => {
	if (DEBUG) console.log(message);
};
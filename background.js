const DEBUG = false;
// Chrome Alarms.
let alarmInfo = { when: Date.now() + 1, periodInMinutes: 60}; // Should fire every 1 hour.
chrome.alarms.create("USCIS_CASE_STATUS", alarmInfo);

chrome.alarms.onAlarm.addListener(alarm => {
	Logger.log("Alarm Called");
	Logger.log(alarm);
	if(alarm.name === "USCIS_CASE_STATUS"){
		processUscisCaseStatus();
	} 
})

function processUscisCaseStatus(){
	// query local storage to find any case id.
	chrome.storage.local.get({ case_ids: [] }, (result) => {
		Logger.log("Get case ids from storage");
		Logger.log(result);
		let caseIds = result.case_ids;
		if (caseIds.length > 0) {
			fetchCaseIdStatus(caseIds, 0);
		}
	});

	// Fetch each status and update local storage.
	var fetchCaseIdStatus = (receiptNos, counter) => {
		const url = "https://egov.uscis.gov/casestatus/caseStatusSearch.do?multiFormAappReceiptNum=" + receiptNos[counter];
		Logger.log(receiptNos[counter]);
		var xhr = new XMLHttpRequest();

		xhr.onload = function() {
			let currentStatusSectionText = this.responseXML.body.getElementsByClassName("current-status-sec")[0].textContent;
			let appointmentSectionText = this.responseXML.body.getElementsByClassName("appointment-sec")[0].textContent;

			const currentStatus = processCurrentStatus(currentStatusSectionText);
			const details = processAppointmentSection(appointmentSectionText, currentStatus);

			Logger.log(receiptNos[counter] + " : " + currentStatus);
			Logger.log(details);
			
			let key = receiptNos[counter];
			chrome.storage.local.get({[key]: {}}, data => {
				let obj = data[key];
				if(obj.currentStatus == undefined || obj.currentStatus != currentStatus) { // Make an entry to storage
					let case_data = {currentStatus: currentStatus, details: details}
					chrome.storage.local.set({ [key]: case_data }, () => {
						Logger.log(case_data);
						// chrome notifications
						options = {
							type: "basic",
							title: "USCIS Case Status " + key,
							message: case_data.currentStatus,
							iconUrl: "/info.png",
							priority: 2
						};
						chrome.notifications.create("", options, () => {
							Logger.log("Notification has been displayed !!!");
						});
					});
				}
			});

			// Loop for other case ids if any.
			counter = counter + 1;
			if (counter < receiptNos.length) {
				setTimeout(fetchCaseIdStatus, 1000, receiptNos, counter);
			}
		}

		xhr.open("GET", url);
		xhr.responseType = "document";
		xhr.send();
	};
}

var processCurrentStatus = currentStatusSectionText => {
	var char_to_be_removed = '+'; // Becase we are getting + at the end of the status.
	var current_status = 'Your Current Status:'
	return currentStatusSectionText
		.replace(char_to_be_removed, "")
		.remove_linebreaks()
		.trim()
		.split(current_status)[1]
		.trim();
}

var processAppointmentSection = (appointmentSectionText, currentStatus) => {
	var char_to_be_removed = 'x'; // Becase we are getting x at the beginning of the text.
	return appointmentSectionText
		.replace(char_to_be_removed, "")
		.remove_linebreaks()
		.trim()
		.split(currentStatus)[1]
		.trim();
}

String.prototype.remove_linebreaks = function() {
	return this.replace(/[\r\n]+/gm, "");
}

var Logger = {};
Logger.log = message => {
	if (DEBUG) console.log(message);
};
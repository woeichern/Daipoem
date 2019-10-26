var ss = SpreadsheetApp.getActiveSpreadsheet();

var sheetData   = ss.getSheetByName('data');
var sheetConfig = ss.getSheetByName('config');
var sheetUser   = ss.getSheetByName('user');

var numRowData      = sheetData.getLastRow();
var numRowUser      = sheetUser.getLastRow();
var numColumnData   = sheetData.getLastColumn();
var numPoem         = numRowData - 1;

var configLine      = getConfig(2);

var configColumnData = {};

for(var i = 0; i < numColumnData; i++){

    var columnName = sheetData.getRange(1, i+1).getValue();

    configColumnData[columnName] = i+1;

}

var LINE_CHANNEL_ACCESS_TOKEN   = configLine.ChannelAccessToken;
var LINE_HEADERS                = {'Content-Type': 'application/json; charset=UTF-8', 'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN,};

/* Other functions */

// To get config JSON
function getConfig(rowIndex){

    return JSON.parse( sheetConfig.getRange(rowIndex, 2).getValue() );

}

// Webhook main function
function doPost(e) {

    var eventObject = JSON.parse(e.postData.contents).events[0];

    var replyToken  = eventObject.replyToken;
    var uid         = eventObject.source.userId;
    var type        = eventObject.type;

    addUser(uid);

    switch(type){

        case 'message':

            var arguments = eventObject.message.text.split(';');

            var command = arguments[0];

            switch(command){

                case 'randompick':

                    replyRandomPoem(replyToken);

                    break;

            }

            break;

        case 'unfollow':

            break;

        case 'follow':

            addUser(uid);

            break;

        default:

            break;

    }

}

// To make poem mesaage list JSON
function makePoemMessageList(poemJSON){

    var messageList = [
            {
                type: "text",
                text: poemJSON['title'] + "\n\n" + poemJSON['content'] + "\n\n【連結】：" + poemJSON['link']
            }
    ];

    return messageList;
}

/* DB functions */

// To add a uid
function addUser(uid){

    // Check if given uid exist in user sheet

    var ifExist = getUserRowIndex(uid) > 0 ? true : false;

    if(!ifExist){

        sheetUser.appendRow([uid,0,"[]"]);

    }

}

// To get user list
function getUserList(){

    var userList = [];

    var userRange = sheetUser.getRange(2, 1, numRowUser, 3);

    var numRowsUserRange = userRange.getNumRows();

    for(var i = 1; i < numRowsUserRange; i++){

        var userItem = {};

        userItem.uid                    = userRange.getCell(i, 1).getValue();
        userItem.ifSubscribeDailyPush   = userRange.getCell(i, 2).getValue() === 1 ? true : false;
        userItem.doneDailyPushPoemIDs   = JSON.parse(userRange.getCell(i, 3).getValue());

        userList.push(userItem);

    }

    return userList;

}

// To get the user list to push daily poem
function getToDailyPushUserList(){

    var userList = getUserList();

    var toDailyPushUserList = userList.filter(function(item, index, array){

        return item.ifSubscribeDailyPush;

    });

    return toDailyPushUserList;

}

// To get row index of given uid in user sheet
function getUserRowIndex(uid){

    var rowIndexUser = 0;

    for(var i = 2; i < numRowUser+1; i++){

        var v = sheetUser.getRange(i, 1).getValue();

        if(v === uid){

            rowIndexUser = i;

            break;

        }

    }

    return rowIndexUser;

}

// To add given poem ID to of done daily push poem IDs list of given user
function addPoemIDToDoneDailyPoemIDs(uid, poemID){

    var userRowIndex = getUserRowIndex(uid);

    var userDoneDailyPushPoemIDs = JSON.parse(sheetUser.getRange(userRowIndex, 3).getValue());

    if( userDoneDailyPushPoemIDs.indexOf(poemID) < 0 ){

        userDoneDailyPushPoemIDs.push(poemID);

        sheetUser.getRange(userRowIndex, 3).setValue( JSON.stringify(userDoneDailyPushPoemIDs.sort()) );

    }

}

// To randomly pick up a poem
function randomPickPoem(){

    var poemJSON = {};

    var indexPoem = Math.floor(Math.random() * (numRowData - 2) ) + 2;

    poemJSON['index']   = parseInt(sheetData.getRange(indexPoem, 1).getDisplayValue());
    poemJSON['title']   = sheetData.getRange(indexPoem, 3).getDisplayValue();
    poemJSON['content'] = sheetData.getRange(indexPoem, 4).getDisplayValue();
    poemJSON['link']    = sheetData.getRange(indexPoem, 6).getDisplayValue();

    return poemJSON;

}

/* LINE functions */

// To reply simple text message
function replySimpleMessage(replyToken, message){

    replyMessage(replyToken, [{type:"text",text:message}]);

}

// To reply with randomly pick-up poem
function replyRandomPoem(replyToken){

    var poemJSON = randomPickPoem();

    var messageList = makePoemMessageList(poemJSON);

    replyMessage(replyToken, messageList);

}

// To reply message
function replyMessage(replyToken, messageList){

    UrlFetchApp.fetch(
		configLine.API.Reply,
		{
			headers: LINE_HEADERS,
			method: 'post',
			payload: JSON.stringify({
				replyToken: replyToken,
				messages: messageList
			})
		}
    );

}

// To push messages
function pushMessage(uid, messageList){

    UrlFetchApp.fetch(
		configLine.API.Push,
		{
			headers: LINE_HEADERS,
			method: 'post',
			payload: JSON.stringify({
				to: uid,
                messages: messageList,
                notificationDisabled: true
			})
		}
    );

}

// Daily push function
function dailyPush(){

    var toDailyPushUserList = getToDailyPushUserList();

    toDailyPushUserList.forEach(function(item, index, array){

        var uid = item.uid;
        var doneDailyPushPoemIDs = item.doneDailyPushPoemIDs;

        var poemJSON = randomPickPoem();

        var poemIndex = poemJSON['index']

        while(doneDailyPushPoemIDs.length === numPoem || doneDailyPushPoemIDs.indexOf(poemIndex) > -1){

            poemJSON = randomPickPoem();

        }

        messageList = makePoemMessageList(poemJSON);

        pushMessage(uid, messageList);

        addPoemIDToDoneDailyPoemIDs(uid, poemIndex);

    });

}
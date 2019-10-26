var CHANNEL_ACCESS_TOKEN = '';
var urlDBDcardPoem = '';

function getPoemRandon(){

    var response = UrlFetchApp.fetch(urlDBDcardPoem+'?api=getPoem');
    Logger.log(response);
    var responseJSON = JSON.parse(response);

    return responseJSON['data'];

}

function getPoem(index){

	var response = UrlFetchApp.fetch(urlDBDcardPoem+'?api=getPoem&indexpoem='+index);
    var responseJSON = JSON.parse(response);

    return responseJSON['data'];
}

function dailyPush(){

	var urlLineAtPush = 'https://api.line.me/v2/bot/message/push';

	var poemJSON = getPoemRandon();

    var messageJSON = {};
    messageJSON['type'] = 'text';
    messageJSON['text'] = poemJSON['title']+"\n\n"+poemJSON['content']+"\n\n【連結】："+poemJSON['link']+"";

	UrlFetchApp.fetch(
		urlLineAtPush,
		{
			'headers': {
				'Content-Type': 'application/json; charset=UTF-8',
				'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN,
			},
			'method': 'post',
			'payload': JSON.stringify({
				'to':'Uab4ef79e0e8e8dd61b92e5d82c7a81ef',
				'messages': [messageJSON]
			})
		}
    );

    setSetTimestamp(poemJSON['title']);
}

function doPost(e) {

    var messageEvent = JSON.parse(e.postData.contents);

    var replyToken = messageEvent.events[0].replyToken;

    if (typeof replyToken === 'undefined') {
        return;
    }

    var poemJSON = {};

    var command = messageEvent.events[0].message.text;

    if( isNaN(command) || command == '[randompick]' ){

        poemJSON = getPoemRandon();

    } else {

        poemJSON = getPoem( parseInt(command) );

    }

    var messageJSON = {};

    messageJSON['type'] = 'text';
    messageJSON['text'] = poemJSON['title']+"\n\n"+poemJSON['content']+"\n\n【連結】："+poemJSON['link']+"";

    var url = 'https://api.line.me/v2/bot/message/reply';

	UrlFetchApp.fetch(
		url,
		{
			'headers': {
				'Content-Type': 'application/json; charset=UTF-8',
				'Authorization': 'Bearer ' + CHANNEL_ACCESS_TOKEN,
			},
			'method': 'post',
			'payload': JSON.stringify({
				'replyToken': replyToken,
				'messages': [messageJSON]
			})
		}
    );
}

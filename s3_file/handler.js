const AWS = require("aws-sdk");
const s3 = new AWS.S3();

const sendResponse = (event, context, responseStatus, responseData, Bucket, Key) => {
	return new Promise((res, rej) => {
		var responseBody = JSON.stringify({
			Status: responseStatus,
			PhysicalResourceId: `${Bucket}-${event.LogicalResourceId}-${Key}`,
			StackId: event.StackId,
			RequestId: event.RequestId,
			LogicalResourceId: event.LogicalResourceId,
			Data: responseData
		});
	
		console.log("RESPONSE BODY:\n", responseBody);
	
		const https = require("https");
		const url = require("url");
	
		const parsedUrl = url.parse(event.ResponseURL);
		const options = {
			hostname: parsedUrl.hostname,
			port: 443,
			path: parsedUrl.path,
			method: "PUT",
			headers: {
				"content-type": "",
				"content-length": responseBody.length
			}
		};
	
		console.log("SENDING RESPONSE...\n");
	
		const request = https.request(options, function(response) {
			console.log("STATUS: " + response.statusCode);
			console.log("HEADERS: " + JSON.stringify(response.headers));

			context.done();

			res();
		});
	
		request.on("error", function(error) {
			console.log("sendResponse Error:" + error);

			context.done();

			rej();
		});
	
		request.write(responseBody);
		request.end();
	});
}

const cleanup = async (Bucket, Key) => {
	await s3.deleteObject({
		Bucket,
		Key
	}).promise();
}

const getKey = (bucket, logicalResourceId, keyPrefix, keySuffix) => {
	const hash = require('crypto').createHash('md5').update(`${bucket}-${logicalResourceId}-${keyPrefix}`).digest("hex");
	return `${keyPrefix}-${hash}${keySuffix}`;
}

exports.index = async (event, context) => {
	const {Bucket, KeyPrefix, KeySuffix, Content} = event.ResourceProperties;

	const Key = getKey(Bucket, event.LogicalResourceId, KeyPrefix, KeySuffix);

	try {
		console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));

		if (event.RequestType == "Delete") {
			await cleanup(Bucket, Key);

			await sendResponse(event, context, "SUCCESS", {}, Bucket, Key);
			return;
		}

		if (event.RequestType === "Update") {
			const {Bucket: oldBucket, KeyPrefix: oldKeyPrefix, KeySuffix: oldKeySuffix} = event.OldResourceProperties;

			const oldKey = getKey(oldBucket, event.logicalResourceId, oldKeyPrefix, oldKeySuffix);

			await cleanup(oldBucket, oldKey);
		}

		await s3.deleteObject({
			Bucket,
			Key
		}).promise();

		const res = await s3.putObject({
			Body: Buffer.from(Content, 'binary'),
			Bucket,
			Key
		}).promise();

		console.log(JSON.stringify(res));

		await sendResponse(event, context, "SUCCESS", {Key}, Bucket, Key);
	}catch(e) {
		await sendResponse(event, context, "FAILURE", {}, Bucket, Key);
	}
};

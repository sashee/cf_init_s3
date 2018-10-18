const AWS = require("aws-sdk");
const s3 = new AWS.S3();

const sendResponse = (event, context, responseStatus, responseData, Bucket, Key) => {
	return new Promise((res, rej) => {
		var responseBody = JSON.stringify({
			Status: responseStatus,
			Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
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

const getKey = (bucket, logicalResourceId, keyPrefix) => {
	const hash = require('crypto').createHash('md5').update(`${bucket}-${logicalResourceId}-${keyPrefix}`).digest("hex");
	return `${keyPrefix}-${hash}`;
}

exports.index = async (event, context) => {
	const {Bucket, KeyPrefix, Content} = event.ResourceProperties;

	const Key = getKey(Bucket, event.LogicalResourceId, KeyPrefix);

	try {
		console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));

		if (event.RequestType == "Delete") {
			await cleanup(Bucket, Key);

			await sendResponse(event, context, "SUCCESS", {}, Bucket, Key);
			return;
		}

		if (event.RequestType === "Update") {
			const {Bucket: oldBucket, KeyPrefix: oldKeyPrefix} = event.OldResourceProperties;

			const oldKey = getKey(oldBucket, event.logicalResourceId, oldKeyPrefix);

			await cleanup(oldBucket, oldKey);
		}

		await s3.deleteObject({
			Bucket,
			Key
		}).promise();

		await s3.putObject({
			Body: Buffer.from(Content, 'binary'),
			Bucket,
			Key
		}).promise();

		await sendResponse(event, context, "SUCCESS", {Key}, Bucket, Key);
	}catch(e) {
		await sendResponse(event, context, "FAILURE", {}, Bucket, Key);
	}
};

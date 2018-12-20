const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const response = require("./cfn-response");

const getKey = (StackId, LogicalResourceId, KeyPrefix, KeySuffix) => {
	const randomPart = require("crypto").createHash("sha1").update([StackId, LogicalResourceId].join(";")).digest("hex").substring(0, 7);

	return `${KeyPrefix}-${randomPart}${KeySuffix}`;
}

exports.index = (event, context) => {
	(async () => {
		try {
			console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));

			const {Bucket, KeyPrefix, KeySuffix, Content} = event.ResourceProperties;

			const Key = getKey(event.StackId, event.LogicalResourceId, KeyPrefix, KeySuffix);

			if (event.RequestType === "Delete") {
				await s3.deleteObject({
					Bucket,
					Key
				}).promise();
			} else {
				await s3.putObject({
					Body: Buffer.from(Content, 'binary'),
					Bucket,
					Key
				}).promise();
			}

			response.send(event, context, response.SUCCESS, {Key}, `${Bucket}/${Key}`);
		}catch(e) {
			console.error(e);
			response.send(event, context, response.FAILED);
		}
	})();
};

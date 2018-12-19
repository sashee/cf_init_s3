const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const response = require("./cfn-response");

const replaceParameters = ["Bucket", "KeyPrefix", "KeySuffix"];

const getKey = (keyPrefix, keySuffix, id) => {
	return `${keyPrefix}-${id}${keySuffix}`;
}

const getId = (StackId, LogicalResourceId, ...properties) => {
	return require("crypto").createHash("sha1").update([StackId, LogicalResourceId, ...properties].join(";")).digest("hex").substring(0, 7);
}

exports.index = (event, context) => {
	(async () => {
		const {Bucket, KeyPrefix, KeySuffix, Content} = event.ResourceProperties;

		try {
			console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));

			const {Key, id} = await (async () => {
				if (event.RequestType === "Delete") {
					const id = event.PhysicalResourceId;
					const Key = getKey(KeyPrefix, KeySuffix, id);

					await s3.deleteObject({
						Bucket,
						Key
					}).promise();

					return {
						Key,
						id,
					};
				} else {
					const id = event.RequestType === "Create" || replaceParameters.some((parameter) => event.ResourceProperties[parameter] !== event.OldResourceProperties[parameter]) ? getId(event.StackId, event.LogicalResourceId, ...replaceParameters.map((parameter) => event.ResourceProperties[parameter])) : event.PhysicalResourceId;
					const Key = getKey(KeyPrefix, KeySuffix, id);

					await s3.putObject({
						Body: Buffer.from(Content, 'binary'),
						Bucket,
						Key
					}).promise();

					return {
						Key,
						id,
					};
				}
			})();

			response.send(event, context, response.SUCCESS, {Key}, id);
		}catch(e) {
			console.error(e);
			response.send(event, context, response.FAILED);
		}
	})();
};

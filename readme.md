## How to deploy

### Package

* ```mkdir -p .tmp && aws cloudformation package --template-file cloudformation.yml --s3-bucket <bucket> --output-template-file .tmp/output.yml```

### Deploy

* ```aws cloudformation deploy --template-file .tmp/output.yml --stack-name <name> --capabilities CAPABILITY_IAM```

## Parameters

### Bucket

The ARN of the bucket to place the object to.

Required: yes

Type: Arn

Update requires: Replacement

### KeyPrefix

The key is constructed with the KeyPrefix, the KeySuffix, and a pseudo-random part: {KeyPrefix}-{Random}{KeySuffix}.

Required: yes

Type: string

Update requires: Replacement

### KeySuffix

Required: yes

Type: string

Update requires: Replacement

### Content

The content of the object.

Required: yes

Type: string

Update requires: No interruption


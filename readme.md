## How to deploy

### Package

* ```mkdir -p .tmp && aws cloudformation package --template-file cloudformation.yml --s3-bucket <bucket> --output-template-file .tmp/output.yml```

### Deploy

* ```aws cloudformation deploy --template-file .tmp/output.yml --stack-name <name> --capabilities CAPABILITY_IAM```
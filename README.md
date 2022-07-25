# AWS Credential Source

Stores your real AWS credentials in the system encrypted password storate and creates temporary session tokens when using AWS CLI.

## Installation

Run `npm i -g awspass`

## Usage

### Setting up or updating a profile

Just run `awspass setup` or `awspass setup --profile <profile name>`

This will ask for two to four parts of your AWS credentials
- Access key ID
- Secret key
- MFA device serial number, must be provided if you are using MFA
- MFA key, if you want awspass to enter OTP response for you

Now all call to AWS CLI for the given profile will use `awspass` to log in.

### Executing other tools with awspass

Just use `awspass exec` followed by the command and arguments. You can also specify the profile by adding `--profile <profile>` before to the command to execute.

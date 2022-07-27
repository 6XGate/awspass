# AWS Credential Source

Stores your real AWS credentials in the system encrypted password storate and creates temporary session tokens when using AWS CLI. Supports automatic and user MFA OTP response.

## Installation

Run `npm i -g @sixxgate/awspass`

## Usage

### Setting up or updating a profile

Just run `awspass setup` or `awspass setup --profile <profile name>`

This will ask for two to four parts of your AWS credentials
- Access key ID
- Secret key
- MFA device serial number, must be provided if you are using MFA
- MFA key, if you want awspass to enter OTP response for you

Now when AWS CLI is called for the given profile, AWS CLI will use `awspass` to log in automatically.

### Executing other tools with awspass

Just use `awspass exec` followed by the command and arguments. You can also specify the profile by adding `--profile <profile>` before to the command to execute.

## Supported features

### Multi-factor authentication

MFA is supported in two ways.
1. Just provide the serial number or ARN of the device associated with your credentials and `awspass` will prompt you for a one-time password from the device.
2. Provde both the serial number or ARN of the device, and the code token for the device, and `awspass` and it will be automatically provided by `awspass` when a session is created or refresh. This usually only works with virtual devices using an ARN.

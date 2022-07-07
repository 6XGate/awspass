# AWS Credential Process

TODO: How about a better name.

## Installation

**Work in progress**

1. Clone the repository
2. Run the following commands in the cloned directory:
   1. `npm ci`, to install the required dependencies.
   2. `node . setup` to setup the your AWS credentials which will be stored in your OS key-ring or key-store.

You can also add a profile name to the `npm . setup`.

## Uninstall

1. Remove the cloned code directory
2. In the AWS CLI configuration, remove any lines referencing `<clone dir>/bin/aws-credentials.cjs session` which will
   be `credential_process` settings.

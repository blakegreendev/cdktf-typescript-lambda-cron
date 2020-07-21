import { Construct } from 'constructs';
import { App, TerraformStack } from 'cdktf';
import { AwsProvider, CloudwatchEventRule, CloudwatchEventTarget, LambdaPermission } from './.gen/providers/aws';
import { Lambda } from './.gen/modules/terraform-aws-modules/lambda/aws';

class MyStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new AwsProvider(this, 'aws', {
      region: "us-west-2"
    })

    const lambdaFn = new Lambda(this, 'Singleton', {
      functionName: "lambda_cron",
      description: "my awesome lambda function",
      handler: "handler.main",
      runtime: "python3.8",
      sourcePath: "../lambda"
    })

    const cwRule = new CloudwatchEventRule(this, 'Rule', {
      scheduleExpression: "rate(5 minutes)",
      name: "lambda_cron"
    })

    new CloudwatchEventTarget(this, 'Target', {
      rule: cwRule.name!,
      targetId: "lambda",
      arn: lambdaFn.thisLambdaFunctionArnOutput
    })

    new LambdaPermission(this, 'Permissions', {
      statementId: "AllowExecutionFromCloudWatch",
      action: "lambda:InvokeFunction",
      functionName: lambdaFn.thisLambdaFunctionNameOutput,
      principal: "events.amazonaws.com",
      sourceArn: cwRule.arn
    })
  }
}

const app = new App();
const stack = new MyStack(app, 'cdktf-typescript-lambda-cron');
stack.addOverride('terraform.backend', {
  remote: {
    hostname: 'app.terraform.io',
    organization: 'GreengoCloud',
    workspaces: {
      name: 'cdktf-typescript-lambda-cron'
    }
  }
});
app.synth();

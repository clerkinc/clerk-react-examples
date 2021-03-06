import formStyles from "./layout/FormLayout.module.css";
import { useClerk, useSignIn } from "@clerk/clerk-react";
import { useState, KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { useHistory } from "react-router-dom";
import { Button } from "./Button";
import { Input } from "./Input";
import { FormLayout } from "./layout/FormLayout";
import { Title } from "./Title";

const SIMPLE_REGEX_PATTERN = /^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;

type SignInInputs = {
  email: string;
  code: string;
};

enum FormSteps {
  EMAIL,
  CODE,
}

type CustomError = {
  type: string;
  message: string;
};

function SignInForm() {
  const history = useHistory();
  const signIn = useSignIn();
  const clerk = useClerk();
  const [formStep, setFormStep] = useState(FormSteps.EMAIL);
  const {
    register,
    getValues,
    trigger,
    formState: { errors: formValidationErrors },
  } = useForm<SignInInputs>({ mode: "all" });

  const preventDefaultSubmission = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  };

  const [error, setError] = useState<CustomError | null>(null);
  const setClerkError = (error: any, type: string) =>
    // @ts-ignore
    setError({ type, message: error.longMessage });

  const sendClerkOtp = async function () {
    const emailAddress = getValues("email");
    const signInAttempt = await signIn.create({
      identifier: emailAddress,
    });

    await signInAttempt.prepareFirstFactor({
      strategy: "email_code",
      // @ts-ignore
      email_address_id: signInAttempt.supportedFirstFactors[0].email_address_id,
    });
  };

  const emailVerification = async function () {
    try {
      setError(null);
      await sendClerkOtp();
      setFormStep((formStep) => formStep + 1);
    } catch (err) {
      if (err.errors) {
        setClerkError(err.errors[0], "email");
      } else {
        throw err;
      }
    }
  };

  const verifyOtp = async function () {
    const otp = getValues("code");
    const signUpAttempt = await signIn.attemptFirstFactor({
      strategy: "email_code",
      code: otp,
    });
    if (signUpAttempt.status === "complete") {
      clerk.setSession(signUpAttempt.createdSessionId, () => history.push("/"));
    }
  };

  return (
    <FormLayout type="sign-in">
      <form onKeyPress={preventDefaultSubmission}>
        <div className={formStyles.fields}>
          {formStep === FormSteps.EMAIL && (
            <>
              <Title>Sign in</Title>
              <Input
                errorText={error?.message}
                helperText="Email address"
                {...register("email", {
                  required: true,
                  pattern: SIMPLE_REGEX_PATTERN,
                })}
              />
              <Button
                disabled={
                  !getValues("email") || Boolean(formValidationErrors["email"])
                }
                onClick={async () => await emailVerification()}
                onKeyPress={async () => await emailVerification()}
              >
                Continue
              </Button>
            </>
          )}
          {formStep === FormSteps.CODE && (
            <>
              <Title>Enter the confirmation code</Title>
              <span className={formStyles.sub}>
                A 6-digit code was just sent to <br />
                {getValues("email")}
              </span>
              <Input
                {...register("code", {
                  required: true,
                  maxLength: 6,
                  minLength: 6,
                })}
                onPaste={async () => await trigger("code")}
              />
              <Button
                disabled={
                  !getValues("code") || Boolean(formValidationErrors["code"])
                }
                onClick={async () => await verifyOtp()}
                onKeyPress={async () => await verifyOtp()}
              >
                Continue
              </Button>
            </>
          )}
        </div>
      </form>
    </FormLayout>
  );
}

export const SignInFormWithClerk = SignInForm;

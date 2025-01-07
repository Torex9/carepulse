"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Dispatch, SetStateAction, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { SelectItem } from "@/components/ui/select";
import {
  AlcoholismValues,
  DiabetesValues,
  Doctors,
  GenderOptions,
  HandicapValues,
  HypertensionValues,
  ScholarshipValues,
  SMSRecievedValues,
} from "@/constants";
import {
  createAppointment,
  createMeeting,
  getAccessToken,
  updateAppointment,
} from "@/lib/actions/appointment.actions";
import { getAppointmentSchema } from "@/lib/validation";
import { Appointment } from "@/types/appwrite.types";

import "react-datepicker/dist/react-datepicker.css";

import CustomFormField, { FormFieldType } from "../CustomFormField";
import SubmitButton from "../SubmitButton";
import { Form, FormControl } from "../ui/form";
import emailjs from "@emailjs/browser";
import { formatDateTime } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";

export const AppointmentForm = ({
  userId,
  patientId,
  type = "create",
  appointment,
  setOpen,
}: {
  userId: string;
  patientId: string;
  type: "create" | "schedule" | "cancel";
  appointment?: Appointment;
  setOpen?: Dispatch<SetStateAction<boolean>>;
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const AppointmentFormValidation = getAppointmentSchema(type);

  const form = useForm<z.infer<typeof AppointmentFormValidation>>({
    resolver: zodResolver(AppointmentFormValidation),
    defaultValues: {
      primaryPhysician: appointment ? appointment?.primaryPhysician : "",
      schedule: appointment
        ? new Date(appointment?.schedule!)
        : new Date(Date.now()),
      age: appointment ? appointment.age : 0,
      gender: appointment ? appointment.gender : ("M" as Gender),
      neighbourhood: appointment ? appointment.neighbourhood : "",
      scholarship: appointment ? appointment.scholarship : "",
      hypertension: appointment ? appointment.hypertension : "",
      diabetes: appointment ? appointment.diabetes : "",
      alcoholism: appointment ? appointment.alcoholism : "",
      handicap: appointment ? appointment.handicap : "",
      smsRecieved: appointment ? appointment.smsRecieved : "",
      reason: appointment ? appointment.reason : "",
      note: appointment?.note || "",
      cancellationReason: appointment?.cancellationReason || "",
    },
  });

  const sendEmailNotification = async (content: string) => {
    //service_3u28z7w

    try {
      await emailjs.send(
        process.env.NEXT_PUBLIC_SERVICEID || "",
        process.env.NEXT_PUBLIC_TEMPLATEID || "",
        {
          from_name: "CarePulse",
          from_email: "toludare68@gmail.com",
          to_name: "CarePulse User",
          to_email: "toludare68@gmail.com",
          message: content,
        },
        process.env.NEXT_PUBLIC_EMAILAPIKEY
      );
    } catch (error) {
      console.error("An error occurred while sending email:", error);
    }
  };

  const onSubmit = async (
    values: z.infer<typeof AppointmentFormValidation>
  ) => {
    setIsLoading(true);

    let status;
    switch (type) {
      case "schedule":
        status = "scheduled";
        break;
      case "cancel":
        status = "cancelled";
        break;
      default:
        status = "pending";
    }

    console.log("Status before update:", status);

    // Get Zoom Access Token
    const accessToken = await getAccessToken();

    // Create Zoom Meeting
    const meetingLink = await createMeeting(accessToken);

    try {
      if (type === "create" && patientId) {
        const appointment = {
          userId,
          patient: patientId,
          primaryPhysician: values.primaryPhysician,
          schedule: new Date(values.schedule),
          age: values.age,
          gender: values.gender,
          neighbourhood: values.neighbourhood,
          scholarship: values.scholarship,
          hypertension: values.hypertension,
          diabetes: values.diabetes,
          alcoholism: values.alcoholism,
          handicap: values.handicap,
          smsRecieved: values.smsRecieved,
          reason: values.reason!,
          status: status as Status,
          note: values.note,
        };

        const newAppointment = await createAppointment(appointment);

        if (newAppointment) {
          form.reset();
          router.push(
            `/patients/${userId}/new-appointment/success?appointmentId=${newAppointment.$id}`
          );
        }
      } else {
        const appointmentToUpdate = {
          userId,
          appointmentId: appointment?.$id!,
          appointment: {
            primaryPhysician: values.primaryPhysician,
            schedule: new Date(values.schedule),
            status: status as Status,
            cancellationReason: values.cancellationReason,
          },
          type,
        };

        const updatedAppointment = await updateAppointment(appointmentToUpdate);

        if (updatedAppointment) {
          const smsEmailMessage = `Greetings from CarePulse. ${type === "schedule" ? `Your appointment is confirmed for ${formatDateTime(values.schedule!).dateTime} with Dr. ${values.primaryPhysician}. Alternatively, here is a Zoom Meeting link for your appointment  ${meetingLink}` : `We regret to inform that your appointment for ${formatDateTime(values.schedule!).dateTime} is cancelled. Reason:  ${values.cancellationReason}`}.`;
          await sendEmailNotification(smsEmailMessage);

          setOpen && setOpen(false);
          form.reset();
        }
      }
    } catch (error) {
      console.log(error);
    }
    setIsLoading(false);
  };

  let buttonLabel;
  switch (type) {
    case "cancel":
      buttonLabel = "Cancel Appointment";
      break;
    case "schedule":
      buttonLabel = "Schedule Appointment";
      break;
    default:
      buttonLabel = "Submit Apppointment";
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 space-y-3">
        {type === "create" && (
          <section className="mb-12 space-y-4">
            <h1 className="header">New Appointment</h1>
            <p className="text-dark-700">
              Request a new appointment in 10 seconds.
            </p>
          </section>
        )}

        {type !== "cancel" && (
          <>
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="primaryPhysician"
              label="Doctor"
              placeholder="Select a doctor"
            >
              {Doctors.map((doctor, i) => (
                <SelectItem key={doctor.name + i} value={doctor.name}>
                  <div className="flex cursor-pointer items-center gap-2">
                    <Image
                      src={doctor.image}
                      width={32}
                      height={32}
                      alt="doctor"
                      className="rounded-full border border-dark-500"
                    />
                    <p>{doctor.name}</p>
                  </div>
                </SelectItem>
              ))}
            </CustomFormField>

            <CustomFormField
              fieldType={FormFieldType.DATE_PICKER}
              control={form.control}
              name="schedule"
              label="Expected appointment date"
              showTimeSelect
              dateFormat="MM/dd/yyyy  -  h:mm aa"
            />

            {/* Age & Gender */}
            <div className="flex  gap-6 flex-row">
              <CustomFormField
                fieldType={FormFieldType.NUMBER}
                control={form.control}
                name="age"
                label="Age"
                disabled={type === "schedule"}
              />

              <CustomFormField
                fieldType={FormFieldType.SKELETON}
                control={form.control}
                name="gender"
                label="Gender"
                renderSkeleton={(field) => (
                  <FormControl>
                    <RadioGroup
                      className="flex h-11 gap-6 xl:justify-between"
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={type === "schedule"}
                    >
                      {GenderOptions.map((option, i) => (
                        <div key={option + i} className="radio-group">
                          <RadioGroupItem value={option} id={option} />
                          <Label htmlFor={option} className="cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                )}
              />
            </div>

            {/* Neighbourhood  */}
            <div className="flex flex-col gap-6 xl:flex-row">
              <CustomFormField
                fieldType={FormFieldType.INPUT}
                control={form.control}
                name="neighbourhood"
                label="Neighbourhood"
                placeholder="CONQUISTA"
                disabled={type === "schedule"}
              />
            </div>

            {/* Scholarship & Hypertension */}
            <div className="flex  gap-6 flex-row">
              <CustomFormField
                fieldType={FormFieldType.SELECT}
                control={form.control}
                name="scholarship"
                label="Do you have a scholarship?"
                placeholder="Select an option"
                disabled={type === "schedule"}
              >
                {ScholarshipValues.map((scholar, i) => (
                  <SelectItem key={scholar.value + i} value={scholar.value}>
                    <div className="flex cursor-pointer items-center gap-2">
                      <p>{scholar.label}</p>
                    </div>
                  </SelectItem>
                ))}
              </CustomFormField>
              <CustomFormField
                fieldType={FormFieldType.SELECT}
                control={form.control}
                name="hypertension"
                label="Hypertension"
                placeholder="Select an option"
                disabled={type === "schedule"}
              >
                {HypertensionValues.map((hyper, i) => (
                  <SelectItem key={hyper.value + i} value={hyper.value}>
                    <div className="flex cursor-pointer items-center gap-2">
                      <p>{hyper.label}</p>
                    </div>
                  </SelectItem>
                ))}
              </CustomFormField>
            </div>

            {/* Diabetes & Alcoholism */}
            <div className="flex  gap-6 flex-row">
              <CustomFormField
                fieldType={FormFieldType.SELECT}
                control={form.control}
                name="diabetes"
                label="Do you have a diabetes?"
                placeholder="Select an option"
                disabled={type === "schedule"}
              >
                {DiabetesValues.map((diab, i) => (
                  <SelectItem key={diab.value + i} value={diab.value}>
                    <div className="flex cursor-pointer items-center gap-2">
                      <p>{diab.label}</p>
                    </div>
                  </SelectItem>
                ))}
              </CustomFormField>
              <CustomFormField
                fieldType={FormFieldType.SELECT}
                control={form.control}
                name="alcoholism"
                label="Are you an alcoholic?"
                placeholder="Select an option"
                disabled={type === "schedule"}
              >
                {AlcoholismValues.map((alcohol, i) => (
                  <SelectItem key={alcohol.value + i} value={alcohol.value}>
                    <div className="flex cursor-pointer items-center gap-2">
                      <p>{alcohol.label}</p>
                    </div>
                  </SelectItem>
                ))}
              </CustomFormField>
            </div>

            {/* Handicap & SMS Recieved */}
            <div className="flex  gap-6 flex-row">
              <CustomFormField
                fieldType={FormFieldType.SELECT}
                control={form.control}
                name="handicap"
                label="Are you handicapped?"
                placeholder="Select an option"
                disabled={type === "schedule"}
              >
                {HandicapValues.map((hand, i) => (
                  <SelectItem key={hand.value + i} value={hand.value}>
                    <div className="flex cursor-pointer items-center gap-2">
                      <p>{hand.label}</p>
                    </div>
                  </SelectItem>
                ))}
              </CustomFormField>
              <CustomFormField
                fieldType={FormFieldType.SELECT}
                control={form.control}
                name="smsRecieved"
                label="Recieved an SMS?"
                placeholder="Select an option"
                disabled={type === "schedule"}
              >
                {SMSRecievedValues.map((sms, i) => (
                  <SelectItem key={sms.value + i} value={sms.value}>
                    <div className="flex cursor-pointer items-center gap-2">
                      <p>{sms.label}</p>
                    </div>
                  </SelectItem>
                ))}
              </CustomFormField>
            </div>

            <div className={`flex  gap-6  ${type === "create" && "flex-row"}`}>
              <CustomFormField
                fieldType={FormFieldType.TEXTAREA}
                control={form.control}
                name="reason"
                label="Appointment reason"
                placeholder="Annual montly check-up"
                disabled={type === "schedule"}
              />

              <CustomFormField
                fieldType={FormFieldType.TEXTAREA}
                control={form.control}
                name="note"
                label="Comments/notes"
                placeholder="Prefer afternoon appointments, if possible"
                disabled={type === "schedule"}
              />
            </div>
          </>
        )}

        {type === "cancel" && (
          <CustomFormField
            fieldType={FormFieldType.TEXTAREA}
            control={form.control}
            name="cancellationReason"
            label="Reason for cancellation"
            placeholder="Urgent meeting came up"
          />
        )}

        <SubmitButton
          isLoading={isLoading}
          className={`${type === "cancel" ? "shad-danger-btn" : "shad-primary-btn"} w-full`}
        >
          {buttonLabel}
        </SubmitButton>
      </form>
    </Form>
  );
};

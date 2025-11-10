import { toast, ToastOptions } from "react-toastify";

const defaultOptions: ToastOptions = {
  position: "top-right",
  autoClose: 7000,
  pauseOnHover: true,
  draggable: true,
};

const formatTimeWindow = (date?: string, time?: string) => {
  if (!date && !time) {
    return "your upcoming flight";
  }

  if (date && time) {
    return `${date} at ${time}`;
  }

  return date ?? time ?? "your upcoming flight";
};

export const showWeatherAlertToast = (params: {
  date?: string;
  time?: string;
  location?: string;
  onView?: () => void;
}) => {
  const windowText = formatTimeWindow(params.date, params.time);

  toast.warn(
    `🌧️ Weather Alert\nYour flight scheduled for ${windowText} has been flagged due to unsafe conditions.`,
    {
      ...defaultOptions,
      autoClose: 10000,
      onClick: params.onView,
    }
  );
};

export const showRescheduleToast = (params: {
  date?: string;
  time?: string;
  onClick?: () => void;
}) => {
  const windowText = formatTimeWindow(params.date, params.time);

  toast.success(
    `✅ Flight Rescheduled\nYour flight is now set for ${windowText}.`,
    {
      ...defaultOptions,
      autoClose: 5000,
      onClick: params.onClick,
    }
  );
};

export const showErrorToast = (message?: string) => {
  toast.error(
    message ?? "⚠️ Weather data unavailable — please try again shortly.",
    {
      ...defaultOptions,
      autoClose: 8000,
    }
  );
};

export const showBookingCancelledToast = (params: {
  date?: string;
  time?: string;
}) => {
  const windowText = formatTimeWindow(params.date, params.time);

  toast.info(
    `📅 Booking Cancelled\nYour flight on ${windowText} has been cancelled due to weather.`,
    {
      ...defaultOptions,
      autoClose: 8000,
    }
  );
};

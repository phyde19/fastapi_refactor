export type InputKind = "text" | "textarea" | "select" | "multiselect" | "toggle";

export type InputValue = string | boolean | string[] | number | null;

export interface InputOption {
  label: string;
  value: string;
}

interface BaseInputField {
  type: InputKind;
  name: string;
  label: string;
  description?: string;
  required?: boolean;
}

export interface TextInputField extends BaseInputField {
  type: "text";
  placeholder?: string;
  default?: string;
}

export interface TextareaInputField extends BaseInputField {
  type: "textarea";
  placeholder?: string;
  default?: string;
  rows?: number;
}

export interface SelectInputField extends BaseInputField {
  type: "select";
  options: InputOption[];
  default?: string;
}

export interface MultiselectInputField extends BaseInputField {
  type: "multiselect";
  options: InputOption[];
  default?: string[];
}

export interface ToggleInputField extends BaseInputField {
  type: "toggle";
  default?: boolean;
}

export type PluginInputField =
  | TextInputField
  | TextareaInputField
  | SelectInputField
  | MultiselectInputField
  | ToggleInputField;

package httpx

import (
	"encoding/json"
	"errors"
	"net/http"
)

type Envelope map[string]any

type ErrorBody struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Fields  map[string]string `json:"fields,omitempty"`
}

func ReadJSON(r *http.Request, dst any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dst); err != nil {
		return err
	}
	return nil
}

func WriteJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func Data(w http.ResponseWriter, status int, data any) {
	WriteJSON(w, status, Envelope{"data": data})
}

func Error(w http.ResponseWriter, status int, code, message string) {
	WriteJSON(w, status, Envelope{"error": ErrorBody{Code: code, Message: message}})
}

func ValidationError(w http.ResponseWriter, fields map[string]string) {
	WriteJSON(w, http.StatusUnprocessableEntity, Envelope{"error": ErrorBody{Code: "validation_error", Message: "Validation failed", Fields: fields}})
}

func BadJSON(w http.ResponseWriter, err error) {
	if err == nil {
		err = errors.New("invalid JSON")
	}
	Error(w, http.StatusBadRequest, "bad_json", err.Error())
}

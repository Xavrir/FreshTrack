package server

import (
	"testing"
	"time"
)

func TestParseHHMM(t *testing.T) {
	cases := []struct {
		in   string
		h, m int
		ok   bool
	}{
		{"09:00", 9, 0, true},
		{"23:59", 23, 59, true},
		{"00:00", 0, 0, true},
		{"7:5", 7, 5, true},
		{"24:00", 0, 0, false},
		{"09:60", 0, 0, false},
		{"abc", 0, 0, false},
		{"0900", 0, 0, false},
		{"", 0, 0, false},
	}
	for _, c := range cases {
		h, m, ok := parseHHMM(c.in)
		if ok != c.ok || (ok && (h != c.h || m != c.m)) {
			t.Fatalf("parseHHMM(%q) = (%d,%d,%v), want (%d,%d,%v)", c.in, h, m, ok, c.h, c.m, c.ok)
		}
	}
}

func TestReminderDue(t *testing.T) {
	loc := time.UTC
	base := func(h, m int) time.Time { return time.Date(2026, 6, 11, h, m, 0, 0, loc) }

	if reminderDue(base(8, 59), "09:00") {
		t.Fatal("should not be due before reminder time")
	}
	if !reminderDue(base(9, 0), "09:00") {
		t.Fatal("should be due exactly at reminder time")
	}
	if !reminderDue(base(14, 30), "09:00") {
		t.Fatal("should be due after reminder time (ledger dedupes repeats)")
	}
	if reminderDue(base(10, 0), "bad") {
		t.Fatal("invalid reminder time should never be due")
	}
}

func TestReminderDueRespectsTimezone(t *testing.T) {
	jakarta, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		t.Skipf("tz data unavailable: %v", err)
	}
	// 02:00 UTC == 09:00 in Jakarta (UTC+7): due there, not yet in UTC.
	utcInstant := time.Date(2026, 6, 11, 2, 0, 0, 0, time.UTC)
	if !reminderDue(utcInstant.In(jakarta), "09:00") {
		t.Fatal("expected due at 09:00 Jakarta local time")
	}
	if reminderDue(utcInstant.In(time.UTC), "09:00") {
		t.Fatal("expected not due at 02:00 UTC")
	}
}

func TestReminderBody(t *testing.T) {
	if got := reminderBody("Milk", 0); got != "Milk expires today." {
		t.Fatalf("lead 0: %q", got)
	}
	if got := reminderBody("Milk", 1); got != "Milk expires tomorrow." {
		t.Fatalf("lead 1: %q", got)
	}
	if got := reminderBody("Milk", 3); got != "Milk expires in 3 days." {
		t.Fatalf("lead 3: %q", got)
	}
}

package api

import (
	"os"
	"regexp"
	"slices"
	"testing"

	"calculator-api/internal/calculator"
)

// TestOpenAPISpecListsEveryRoute keeps api/openapi.yaml in sync with the
// router: adding an operation without documenting it fails this test.
func TestOpenAPISpecListsEveryRoute(t *testing.T) {
	spec, err := os.ReadFile("../../api/openapi.yaml")
	if err != nil {
		t.Fatal(err)
	}

	var documented []string
	for _, match := range regexp.MustCompile(`(?m)^  (/\S+):$`).FindAllSubmatch(spec, -1) {
		documented = append(documented, string(match[1]))
	}

	want := []string{"/api/v1/installments", "/healthz"}
	for _, name := range calculator.Names() {
		want = append(want, "/api/v1/"+name)
	}

	slices.Sort(documented)
	slices.Sort(want)
	if !slices.Equal(documented, want) {
		t.Errorf("openapi.yaml documents %v, want %v", documented, want)
	}
}

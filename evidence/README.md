# Evidence publication boundary

The repository includes release-summary.json with masked counts, versions and validation results. Raw logs, device XML/screenshots, build output and private fixture snapshots remain on the original workstation under evidence/ and .local/. They are excluded from Git because they may contain customer data or local credentials. Historical docs link to those local evidence directories; missing raw evidence on GitHub does not mean those checks were rerun or independently verified by the reader.

Run the documented tests locally to generate fresh evidence; do not reuse real calling permission or customer lists for automated fixtures.

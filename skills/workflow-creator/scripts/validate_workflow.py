#!/usr/bin/env python3
"""
Workflow validator

Validates workflow schema and instructions files.
"""

import json
import sys
from pathlib import Path


def validate_schema(schema_path):
    """Validate workflow schema JSON."""
    errors = []
    warnings = []

    # Check file exists
    if not schema_path.exists():
        errors.append(f"Schema file not found: {schema_path}")
        return errors, warnings

    # Load and parse JSON
    try:
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema = json.load(f)
    except json.JSONDecodeError as e:
        errors.append(f"Invalid JSON: {e}")
        return errors, warnings
    except Exception as e:
        errors.append(f"Error reading file: {e}")
        return errors, warnings

    # Validate required top-level fields
    required_fields = ['workflow_name', 'workflow_display_name', 'description',
                      'version', 'created_date', 'parameters', 'steps']

    for field in required_fields:
        if field not in schema:
            errors.append(f"Missing required field: {field}")

    if errors:
        return errors, warnings

    # Validate workflow_name format
    name = schema['workflow_name']
    if not name.islower() or not all(c.isalnum() or c == '-' for c in name):
        errors.append(f"workflow_name must be lowercase-with-hyphens: {name}")

    # Validate parameters
    if not isinstance(schema['parameters'], list):
        errors.append("parameters must be a list")
    else:
        param_names = set()
        for i, param in enumerate(schema['parameters']):
            # Check required parameter fields
            required_param_fields = ['name', 'display_name', 'description', 'type', 'required']
            for field in required_param_fields:
                if field not in param:
                    errors.append(f"Parameter {i}: Missing required field '{field}'")

            # Check parameter name uniqueness
            if 'name' in param:
                if param['name'] in param_names:
                    errors.append(f"Duplicate parameter name: {param['name']}")
                param_names.add(param['name'])

                # Validate parameter name format
                if not param['name'].islower() or not all(c.isalnum() or c == '_' for c in param['name']):
                    errors.append(f"Parameter name must be lowercase_with_underscores: {param['name']}")

            # Validate parameter type
            if 'type' in param:
                valid_types = ['string', 'integer', 'float', 'boolean', 'select', 'files']
                if param['type'] not in valid_types:
                    errors.append(f"Parameter {param.get('name', i)}: Invalid type '{param['type']}'. Must be one of: {valid_types}")

                # Check for options if type is select
                if param['type'] == 'select' and 'options' not in param:
                    errors.append(f"Parameter {param.get('name', i)}: 'select' type requires 'options' field")

                # Check for files type validation
                if param['type'] == 'files':
                    if 'default' in param and not isinstance(param['default'], list):
                        errors.append(f"Parameter {param.get('name', i)}: 'files' type default value must be an array")
                    elif 'default' in param:
                        for file_item in param['default']:
                            if not isinstance(file_item, str):
                                errors.append(f"Parameter {param.get('name', i)}: 'files' type default array must contain only strings")

            # Check default value presence for ALL parameters (required and optional)
            if 'default' not in param:
                errors.append(f"Parameter {param.get('name', i)}: All parameters must have a 'default' value (required={param.get('required', True)})")

    # Validate steps
    if not isinstance(schema['steps'], list):
        errors.append("steps must be a list")
    elif len(schema['steps']) == 0:
        errors.append("Workflow must have at least one step")
    else:
        step_numbers = set()
        step_names = set()
        param_names_list = [p['name'] for p in schema['parameters'] if 'name' in p]

        for i, step in enumerate(schema['steps']):
            # Check required step fields
            required_step_fields = ['step_number', 'step_name', 'display_name', 'description']
            for field in required_step_fields:
                if field not in step:
                    errors.append(f"Step {i}: Missing required field '{field}'")

            # Check step number uniqueness and sequence
            if 'step_number' in step:
                if step['step_number'] in step_numbers:
                    errors.append(f"Duplicate step_number: {step['step_number']}")
                step_numbers.add(step['step_number'])

            # Check step name uniqueness and format
            if 'step_name' in step:
                if step['step_name'] in step_names:
                    errors.append(f"Duplicate step_name: {step['step_name']}")
                step_names.add(step['step_name'])

                if not step['step_name'].islower() or not all(c.isalnum() or c == '_' for c in step['step_name']):
                    errors.append(f"Step name must be lowercase_with_underscores: {step['step_name']}")

            # Validate parameters_used references
            if 'parameters_used' in step:
                if not isinstance(step['parameters_used'], list):
                    errors.append(f"Step {step.get('step_name', i)}: parameters_used must be a list")
                else:
                    for param_ref in step['parameters_used']:
                        if param_ref not in param_names_list:
                            errors.append(f"Step {step.get('step_name', i)}: Unknown parameter '{param_ref}'")

        # Check step numbers are sequential starting from 1
        if step_numbers:
            expected = set(range(1, len(schema['steps']) + 1))
            if step_numbers != expected:
                warnings.append(f"Step numbers should be sequential from 1 to {len(schema['steps'])}")

    return errors, warnings


def validate_instructions(instructions_path, schema):
    """Validate workflow instructions file."""
    errors = []
    warnings = []

    # Check file exists
    if not instructions_path.exists():
        errors.append(f"Instructions file not found: {instructions_path}")
        return errors, warnings

    # Read instructions
    try:
        with open(instructions_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        errors.append(f"Error reading instructions: {e}")
        return errors, warnings

    # Check for parameter references
    param_names = [p['name'] for p in schema.get('parameters', []) if 'name' in p]
    for param_name in param_names:
        if f"{{{param_name}}}" not in content:
            warnings.append(f"Parameter '{param_name}' not referenced in instructions")

    # Check for step headers
    steps = schema.get('steps', [])
    for step in steps:
        step_name = step.get('display_name', '')
        if step_name and step_name not in content:
            warnings.append(f"Step '{step_name}' not found in instructions")

    # Cross-validate step count between schema and SKILL.md
    import re
    md_step_headers = re.findall(r'^###\s+Step\s+\d+', content, re.MULTILINE)
    md_step_count = len(md_step_headers)
    json_step_count = len(steps)
    if md_step_count > 0 and json_step_count != md_step_count:
        errors.append(
            f"Step count mismatch: workflow_schema.json has {json_step_count} step(s) "
            f"but SKILL.md has {md_step_count} step section(s). Both files must be in sync."
        )

    # Check for basic structure
    if '## Parameters' not in content and len(param_names) > 0:
        warnings.append("Instructions should include a '## Parameters' section")

    if '## Steps' not in content and len(steps) > 0:
        warnings.append("Instructions should include a '## Steps' section")

    return errors, warnings


def validate_workflow(workflow_name):
    """Validate a complete workflow."""
    print(f"=== Validating workflow: {workflow_name} ===\n")

    # Find schema file in /workspace/workflow/{workflow_name}/
    schema_path = Path(f"/workspace/workflow/{workflow_name}/workflow_schema.json")
    if not schema_path.exists():
        # Fallback: try relative path from current directory
        schema_path = Path.cwd() / "workflow" / workflow_name / "workflow_schema.json"

    # Validate schema
    print("Validating schema...")
    schema_errors, schema_warnings = validate_schema(schema_path)

    if schema_errors:
        print("\n❌ Schema Errors:")
        for error in schema_errors:
            print(f"  - {error}")

    if schema_warnings:
        print("\n⚠️  Schema Warnings:")
        for warning in schema_warnings:
            print(f"  - {warning}")

    # Load schema for instructions validation
    schema = {}
    if not schema_errors:
        try:
            with open(schema_path, 'r', encoding='utf-8') as f:
                schema = json.load(f)
        except:
            pass

    # Find and validate instructions in /workspace/workflow/{workflow_name}/
    instructions_path = Path(f"/workspace/workflow/{workflow_name}/SKILL.md")
    if not instructions_path.exists():
        # Fallback: try relative path from current directory
        instructions_path = Path.cwd() / "skills" / workflow_name / "SKILL.md"

    if instructions_path.exists():
        print("\nValidating instructions...")
        inst_errors, inst_warnings = validate_instructions(instructions_path, schema)

        if inst_errors:
            print("\n❌ Instructions Errors:")
            for error in inst_errors:
                print(f"  - {error}")

        if inst_warnings:
            print("\n⚠️  Instructions Warnings:")
            for warning in inst_warnings:
                print(f"  - {warning}")
    else:
        print(f"\n⚠️  Instructions file not found: {instructions_path}")
        inst_errors = []

    # Summary
    total_errors = len(schema_errors) + len(inst_errors) if instructions_path.exists() else len(schema_errors)
    total_warnings = len(schema_warnings) + len(inst_warnings) if instructions_path.exists() else len(schema_warnings)

    print(f"\n{'='*50}")
    if total_errors == 0:
        print("✅ Validation passed!")
        if total_warnings > 0:
            print(f"⚠️  {total_warnings} warning(s) found")
        return True
    else:
        print(f"❌ Validation failed with {total_errors} error(s)")
        if total_warnings > 0:
            print(f"⚠️  {total_warnings} warning(s) found")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: validate_workflow.py <workflow_name>")
        print("\nExample:")
        print("  validate_workflow.py research-to-presentation")
        sys.exit(1)

    workflow_name = sys.argv[1]
    success = validate_workflow(workflow_name)
    sys.exit(0 if success else 1)

# SIG # Begin Windows Authenticode signature block
# MIIoKgYJKoZIhvcNAQcCoIIoGzCCKBcCAQExDzANBglghkgBZQMEAgEFADB5Bgor
# BgEEAYI3AgEEoGswaTA0BgorBgEEAYI3AgEeMCYCAwEAAAQQse8BENmB6EqSR2hd
# JGAGggIBAAIBAAIBAAIBAAIBADAxMA0GCWCGSAFlAwQCAQUABCCXeVWgbGuEBt0W
# cfy//mx/0b8FChsHiXSe3yAMq9wGF6CCDXYwggX0MIID3KADAgECAhMzAAAEhV6Z
# 7A5ZL83XAAAAAASFMA0GCSqGSIb3DQEBCwUAMH4xCzAJBgNVBAYTAlVTMRMwEQYD
# VQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNy
# b3NvZnQgQ29ycG9yYXRpb24xKDAmBgNVBAMTH01pY3Jvc29mdCBDb2RlIFNpZ25p
# bmcgUENBIDIwMTEwHhcNMjUwNjE5MTgyMTM3WhcNMjYwNjE3MTgyMTM3WjB0MQsw
# CQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9u
# ZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMR4wHAYDVQQDExVNaWNy
# b3NvZnQgQ29ycG9yYXRpb24wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIB
# AQDASkh1cpvuUqfbqxele7LCSHEamVNBfFE4uY1FkGsAdUF/vnjpE1dnAD9vMOqy
# 5ZO49ILhP4jiP/P2Pn9ao+5TDtKmcQ+pZdzbG7t43yRXJC3nXvTGQroodPi9USQi
# 9rI+0gwuXRKBII7L+k3kMkKLmFrsWUjzgXVCLYa6ZH7BCALAcJWZTwWPoiT4HpqQ
# hJcYLB7pfetAVCeBEVZD8itKQ6QA5/LQR+9X6dlSj4Vxta4JnpxvgSrkjXCz+tlJ
# 67ABZ551lw23RWU1uyfgCfEFhBfiyPR2WSjskPl9ap6qrf8fNQ1sGYun2p4JdXxe
# UAKf1hVa/3TQXjvPTiRXCnJPAgMBAAGjggFzMIIBbzAfBgNVHSUEGDAWBgorBgEE
# AYI3TAgBBggrBgEFBQcDAzAdBgNVHQ4EFgQUuCZyGiCuLYE0aU7j5TFqY05kko0w
# RQYDVR0RBD4wPKQ6MDgxHjAcBgNVBAsTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEW
# MBQGA1UEBRMNMjMwMDEyKzUwNTM1OTAfBgNVHSMEGDAWgBRIbmTlUAXTgqoXNzci
# tW2oynUClTBUBgNVHR8ETTBLMEmgR6BFhkNodHRwOi8vd3d3Lm1pY3Jvc29mdC5j
# b20vcGtpb3BzL2NybC9NaWNDb2RTaWdQQ0EyMDExXzIwMTEtMDctMDguY3JsMGEG
# CCsGAQUFBwEBBFUwUzBRBggrBgEFBQcwAoZFaHR0cDovL3d3dy5taWNyb3NvZnQu
# Y29tL3BraW9wcy9jZXJ0cy9NaWNDb2RTaWdQQ0EyMDExXzIwMTEtMDctMDguY3J0
# MAwGA1UdEwEB/wQCMAAwDQYJKoZIhvcNAQELBQADggIBACjmqAp2Ci4sTHZci+qk
# tEAKsFk5HNVGKyWR2rFGXsd7cggZ04H5U4SV0fAL6fOE9dLvt4I7HBHLhpGdE5Uj
# Ly4NxLTG2bDAkeAVmxmd2uKWVGKym1aarDxXfv3GCN4mRX+Pn4c+py3S/6Kkt5eS
# DAIIsrzKw3Kh2SW1hCwXX/k1v4b+NH1Fjl+i/xPJspXCFuZB4aC5FLT5fgbRKqns
# WeAdn8DsrYQhT3QXLt6Nv3/dMzv7G/Cdpbdcoul8FYl+t3dmXM+SIClC3l2ae0wO
# lNrQ42yQEycuPU5OoqLT85jsZ7+4CaScfFINlO7l7Y7r/xauqHbSPQ1r3oIC+e71
# 5s2G3ClZa3y99aYx2lnXYe1srcrIx8NAXTViiypXVn9ZGmEkfNcfDiqGQwkml5z9
# nm3pWiBZ69adaBBbAFEjyJG4y0a76bel/4sDCVvaZzLM3TFbxVO9BQrjZRtbJZbk
# C3XArpLqZSfx53SuYdddxPX8pvcqFuEu8wcUeD05t9xNbJ4TtdAECJlEi0vvBxlm
# M5tzFXy2qZeqPMXHSQYqPgZ9jvScZ6NwznFD0+33kbzyhOSz/WuGbAu4cHZG8gKn
# lQVT4uA2Diex9DMs2WHiokNknYlLoUeWXW1QrJLpqO82TLyKTbBM/oZHAdIc0kzo
# STro9b3+vjn2809D0+SOOCVZMIIHejCCBWKgAwIBAgIKYQ6Q0gAAAAAAAzANBgkq
# hkiG9w0BAQsFADCBiDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24x
# EDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlv
# bjEyMDAGA1UEAxMpTWljcm9zb2Z0IFJvb3QgQ2VydGlmaWNhdGUgQXV0aG9yaXR5
# IDIwMTEwHhcNMTEwNzA4MjA1OTA5WhcNMjYwNzA4MjEwOTA5WjB+MQswCQYDVQQG
# EwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwG
# A1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSgwJgYDVQQDEx9NaWNyb3NvZnQg
# Q29kZSBTaWduaW5nIFBDQSAyMDExMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIIC
# CgKCAgEAq/D6chAcLq3YbqqCEE00uvK2WCGfQhsqa+laUKq4BjgaBEm6f8MMHt03
# a8YS2AvwOMKZBrDIOdUBFDFC04kNeWSHfpRgJGyvnkmc6Whe0t+bU7IKLMOv2akr
# rnoJr9eWWcpgGgXpZnboMlImEi/nqwhQz7NEt13YxC4Ddato88tt8zpcoRb0Rrrg
# OGSsbmQ1eKagYw8t00CT+OPeBw3VXHmlSSnnDb6gE3e+lD3v++MrWhAfTVYoonpy
# 4BI6t0le2O3tQ5GD2Xuye4Yb2T6xjF3oiU+EGvKhL1nkkDstrjNYxbc+/jLTswM9
# sbKvkjh+0p2ALPVOVpEhNSXDOW5kf1O6nA+tGSOEy/S6A4aN91/w0FK/jJSHvMAh
# dCVfGCi2zCcoOCWYOUo2z3yxkq4cI6epZuxhH2rhKEmdX4jiJV3TIUs+UsS1Vz8k
# A/DRelsv1SPjcF0PUUZ3s/gA4bysAoJf28AVs70b1FVL5zmhD+kjSbwYuER8ReTB
# w3J64HLnJN+/RpnF78IcV9uDjexNSTCnq47f7Fufr/zdsGbiwZeBe+3W7UvnSSmn
# Eyimp31ngOaKYnhfsi+E11ecXL93KCjx7W3DKI8sj0A3T8HhhUSJxAlMxdSlQy90
# lfdu+HggWCwTXWCVmj5PM4TasIgX3p5O9JawvEagbJjS4NaIjAsCAwEAAaOCAe0w
# ggHpMBAGCSsGAQQBgjcVAQQDAgEAMB0GA1UdDgQWBBRIbmTlUAXTgqoXNzcitW2o
# ynUClTAZBgkrBgEEAYI3FAIEDB4KAFMAdQBiAEMAQTALBgNVHQ8EBAMCAYYwDwYD
# VR0TAQH/BAUwAwEB/zAfBgNVHSMEGDAWgBRyLToCMZBDuRQFTuHqp8cx0SOJNDBa
# BgNVHR8EUzBRME+gTaBLhklodHRwOi8vY3JsLm1pY3Jvc29mdC5jb20vcGtpL2Ny
# bC9wcm9kdWN0cy9NaWNSb29DZXJBdXQyMDExXzIwMTFfMDNfMjIuY3JsMF4GCCsG
# AQUFBwEBBFIwUDBOBggrBgEFBQcwAoZCaHR0cDovL3d3dy5taWNyb3NvZnQuY29t
# L3BraS9jZXJ0cy9NaWNSb29DZXJBdXQyMDExXzIwMTFfMDNfMjIuY3J0MIGfBgNV
# HSAEgZcwgZQwgZEGCSsGAQQBgjcuAzCBgzA/BggrBgEFBQcCARYzaHR0cDovL3d3
# dy5taWNyb3NvZnQuY29tL3BraW9wcy9kb2NzL3ByaW1hcnljcHMuaHRtMEAGCCsG
# AQUFBwICMDQeMiAdAEwAZQBnAGEAbABfAHAAbwBsAGkAYwB5AF8AcwB0AGEAdABl
# AG0AZQBuAHQALiAdMA0GCSqGSIb3DQEBCwUAA4ICAQBn8oalmOBUeRou09h0ZyKb
# C5YR4WOSmUKWfdJ5DJDBZV8uLD74w3LRbYP+vj/oCso7v0epo/Np22O/IjWll11l
# hJB9i0ZQVdgMknzSGksc8zxCi1LQsP1r4z4HLimb5j0bpdS1HXeUOeLpZMlEPXh6
# I/MTfaaQdION9MsmAkYqwooQu6SpBQyb7Wj6aC6VoCo/KmtYSWMfCWluWpiW5IP0
# wI/zRive/DvQvTXvbiWu5a8n7dDd8w6vmSiXmE0OPQvyCInWH8MyGOLwxS3OW560
# STkKxgrCxq2u5bLZ2xWIUUVYODJxJxp/sfQn+N4sOiBpmLJZiWhub6e3dMNABQam
# ASooPoI/E01mC8CzTfXhj38cbxV9Rad25UAqZaPDXVJihsMdYzaXht/a8/jyFqGa
# J+HNpZfQ7l1jQeNbB5yHPgZ3BtEGsXUfFL5hYbXw3MYbBL7fQccOKO7eZS/sl/ah
# XJbYANahRr1Z85elCUtIEJmAH9AAKcWxm6U/RXceNcbSoqKfenoi+kiVH6v7RyOA
# 9Z74v2u3S5fi63V4GuzqN5l5GEv/1rMjaHXmr/r8i+sLgOppO6/8MO0ETI7f33Vt
# Y5E90Z1WTk+/gFcioXgRMiF670EKsT/7qMykXcGhiJtXcVZOSEXAQsmbdlsKgEhr
# /Xmfwb1tbWrJUnMTDXpQzTGCGgowghoGAgEBMIGVMH4xCzAJBgNVBAYTAlVTMRMw
# EQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVN
# aWNyb3NvZnQgQ29ycG9yYXRpb24xKDAmBgNVBAMTH01pY3Jvc29mdCBDb2RlIFNp
# Z25pbmcgUENBIDIwMTECEzMAAASFXpnsDlkvzdcAAAAABIUwDQYJYIZIAWUDBAIB
# BQCgga4wGQYJKoZIhvcNAQkDMQwGCisGAQQBgjcCAQQwHAYKKwYBBAGCNwIBCzEO
# MAwGCisGAQQBgjcCARUwLwYJKoZIhvcNAQkEMSIEIAVtpOvhH5oatX0ciOv6Oicd
# QFQih2OUFy7kjnlG7kJYMEIGCisGAQQBgjcCAQwxNDAyoBSAEgBNAGkAYwByAG8A
# cwBvAGYAdKEagBhodHRwOi8vd3d3Lm1pY3Jvc29mdC5jb20wDQYJKoZIhvcNAQEB
# BQAEggEAfYJsGbv2cLBuWXZHkVhaONIZfqLFIYGFUPPsqtHR0gb2h3oyoHGhETGy
# 75JCAe7M55ECWDezwk5YvP89OYU7/su/BByFBLt5mflLH2ryYJX6zVJpvGyj7O35
# GwNV1/rFrRTxFXB5B09ilu2zVNEgvK8G7NHaUi+kCVqXJuHQxNAdEbQecAeN1TS8
# aJaYJoIqnbjkIKU9ryl7a1sHuapMg8yCV4vX8C+lSSYrs/kVZFehXqDdVrpaUgeL
# GhbW8Zpc4Jqed9weYg9uPPNyAgYdiHhuKJFM9KKpuWrkY0zDDoOzO9sBwjB9HZ1F
# NH3SnBaxqUubV1sGejahqf2yNy/BfaGCF5QwgheQBgorBgEEAYI3AwMBMYIXgDCC
# F3wGCSqGSIb3DQEHAqCCF20wghdpAgEDMQ8wDQYJYIZIAWUDBAIBBQAwggFSBgsq
# hkiG9w0BCRABBKCCAUEEggE9MIIBOQIBAQYKKwYBBAGEWQoDATAxMA0GCWCGSAFl
# AwQCAQUABCCdinHKIcFNIY6XbYFERA8ZSiTl7HcBI2sp256jPHyQ5wIGacFMpdcy
# GBMyMDI2MDQwNzE0MDEzNS41OTlaMASAAgH0oIHRpIHOMIHLMQswCQYDVQQGEwJV
# UzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UE
# ChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSUwIwYDVQQLExxNaWNyb3NvZnQgQW1l
# cmljYSBPcGVyYXRpb25zMScwJQYDVQQLEx5uU2hpZWxkIFRTUyBFU046ODYwMy0w
# NUUwLUQ5NDcxJTAjBgNVBAMTHE1pY3Jvc29mdCBUaW1lLVN0YW1wIFNlcnZpY2Wg
# ghHqMIIHIDCCBQigAwIBAgITMwAAAiWAxzfGzap3SQABAAACJTANBgkqhkiG9w0B
# AQsFADB8MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UE
# BxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSYwJAYD
# VQQDEx1NaWNyb3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAxMDAeFw0yNjAyMTkxOTQw
# MDFaFw0yNzA1MTcxOTQwMDFaMIHLMQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2Fz
# aGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENv
# cnBvcmF0aW9uMSUwIwYDVQQLExxNaWNyb3NvZnQgQW1lcmljYSBPcGVyYXRpb25z
# MScwJQYDVQQLEx5uU2hpZWxkIFRTUyBFU046ODYwMy0wNUUwLUQ5NDcxJTAjBgNV
# BAMTHE1pY3Jvc29mdCBUaW1lLVN0YW1wIFNlcnZpY2UwggIiMA0GCSqGSIb3DQEB
# AQUAA4ICDwAwggIKAoICAQCm8RIP0eLA46VcCPovvmqsIlN6qkmz5IsHWmUU0neU
# qp8uGxadeo+SwWBCwQ5alZI/DNdpXfyiZLZR6XYgpRPFzepIl7OCDb4NtEskJCIZ
# DkQMNwrH9YwUyu71GGigsLIxeleHtA3utoVTeHjS1b8UnwORRtknKkyrUArT6ZpB
# 2rodIcmcLcv3x3wwgYlOs0FEg5EsVrZb7LNc/nd0bXDp+HTOWWui8eoTVwJeLxcV
# P869oF8li5SU81aa2tGJ6/Jsejiz9JMW8SJXKBT2DCXMOUkCsGjonPZRqfvoMSIQ
# ZgtaOTyAJlrvsy0TZ78XrGqoygtQimQnbOAL4KNLSCuW5TZEQGTHLOQJGgggb3j5
# gKC778+RIPJA+n/hmHJ/x4qT/HTTPoVeMCcuBKWrQXR1+/pYau3Fwe0tWIyG+LWz
# kRr/ZNPPupcA2Yci3qn8HR9RwvQopqSNJwn2Ri6am8AQyfVVy/BBw0t6jpoRPjwK
# vuUjfCzpae6duOxQtQ1XDN9PA2yl9sDko/+AXV/SOe8ea8QoQcv3s3ErkG+Lp6hn
# vw6OMPian4ggNkRtgtB7ro1OiopOUXJn9Y5EO3JUAXNcuM9m+5My1VEuvGytgAH3
# uxmslTnW3YbrfazaySCSSnWkhaOZ33hgbuUQfH7n2NFEAUc/cFzfmCQUikWisnJY
# ywIDAQABo4IBSTCCAUUwHQYDVR0OBBYEFLE40qoXTuMHX3AfZUu1n8nx2h93MB8G
# A1UdIwQYMBaAFJ+nFV0AXmJdg/Tl0mWnG1M1GelyMF8GA1UdHwRYMFYwVKBSoFCG
# Tmh0dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMvY3JsL01pY3Jvc29mdCUy
# MFRpbWUtU3RhbXAlMjBQQ0ElMjAyMDEwKDEpLmNybDBsBggrBgEFBQcBAQRgMF4w
# XAYIKwYBBQUHMAKGUGh0dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMvY2Vy
# dHMvTWljcm9zb2Z0JTIwVGltZS1TdGFtcCUyMFBDQSUyMDIwMTAoMSkuY3J0MAwG
# A1UdEwEB/wQCMAAwFgYDVR0lAQH/BAwwCgYIKwYBBQUHAwgwDgYDVR0PAQH/BAQD
# AgeAMA0GCSqGSIb3DQEBCwUAA4ICAQAHnfc2yUyoHZbvvyVKFuXh5HxxHIvIaR9J
# WpIfITJlc/Ki03juR+vckzq3tp5fFH5LL7eIFXRIuoewMsvWeFrWufrrW4HhmhCw
# kqArfA1C0xk+HaYs2O48YSxMX9lgS1kTTIb3YsfoFdFpKurPf2nc2Yd4wLg+Fgwm
# kxkeyE3MUKVna8SZeVpEjnS5ucFck4srPwK2ORAf70I23GGyPhqgIKZphNXhSscT
# AQsyIqB5GwDMdRV5LK37NfU4YmxvCYh3TFYE/Gh01Q6yJvf9HxiEZpwW+oUk0gru
# Hobg3sgIR5rfgUo8l30vUnaDYMcPAClaFMC/QbHZSaUhWXZG1OOcMp0g9vYQNLDE
# qFX2jlquvzVSSwtHtm1KTldCjRED+kdCybcPxbPalwJigXc1BsI9CitnTf0ljwb9
# NkZ/JVI8/D62rXXzhz4F3u0iVGzwncGaxRxHG/Xv4nTrpkOeepoYbNBbMWS2G1qP
# 3Xj7pVf0+4qRyAqJ0stjQjoVOJImVPWRjz5PR3Dn6adQVMBJDM6gDrj1rZTFVgCt
# TijqGZSGzvXpGkF3vYsyE6ZDma/kGdiUe5saeI6lH66PiWWXgqxt7sy2Ezv0yIjS
# Vv+eMOT2QMUiZ6WCc7gVtAmXpfeIus+NmgFvM+Ic1X58e4I9EL4ZSAidSpWW0GZT
# LNC02mryLjCCB3EwggVZoAMCAQICEzMAAAAVxedrngKbSZkAAAAAABUwDQYJKoZI
# hvcNAQELBQAwgYgxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAw
# DgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24x
# MjAwBgNVBAMTKU1pY3Jvc29mdCBSb290IENlcnRpZmljYXRlIEF1dGhvcml0eSAy
# MDEwMB4XDTIxMDkzMDE4MjIyNVoXDTMwMDkzMDE4MzIyNVowfDELMAkGA1UEBhMC
# VVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNV
# BAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEmMCQGA1UEAxMdTWljcm9zb2Z0IFRp
# bWUtU3RhbXAgUENBIDIwMTAwggIiMA0GCSqGSIb3DQEBAQUAA4ICDwAwggIKAoIC
# AQDk4aZM57RyIQt5osvXJHm9DtWC0/3unAcH0qlsTnXIyjVX9gF/bErg4r25Phdg
# M/9cT8dm95VTcVrifkpa/rg2Z4VGIwy1jRPPdzLAEBjoYH1qUoNEt6aORmsHFPPF
# dvWGUNzBRMhxXFExN6AKOG6N7dcP2CZTfDlhAnrEqv1yaa8dq6z2Nr41JmTamDu6
# GnszrYBbfowQHJ1S/rboYiXcag/PXfT+jlPP1uyFVk3v3byNpOORj7I5LFGc6XBp
# Dco2LXCOMcg1KL3jtIckw+DJj361VI/c+gVVmG1oO5pGve2krnopN6zL64NF50Zu
# yjLVwIYwXE8s4mKyzbnijYjklqwBSru+cakXW2dg3viSkR4dPf0gz3N9QZpGdc3E
# XzTdEonW/aUgfX782Z5F37ZyL9t9X4C626p+Nuw2TPYrbqgSUei/BQOj0XOmTTd0
# lBw0gg/wEPK3Rxjtp+iZfD9M269ewvPV2HM9Q07BMzlMjgK8QmguEOqEUUbi0b1q
# GFphAXPKZ6Je1yh2AuIzGHLXpyDwwvoSCtdjbwzJNmSLW6CmgyFdXzB0kZSU2LlQ
# +QuJYfM2BjUYhEfb3BvR/bLUHMVr9lxSUV0S2yW6r1AFemzFER1y7435UsSFF5PA
# PBXbGjfHCBUYP3irRbb1Hode2o+eFnJpxq57t7c+auIurQIDAQABo4IB3TCCAdkw
# EgYJKwYBBAGCNxUBBAUCAwEAATAjBgkrBgEEAYI3FQIEFgQUKqdS/mTEmr6CkTxG
# NSnPEP8vBO4wHQYDVR0OBBYEFJ+nFV0AXmJdg/Tl0mWnG1M1GelyMFwGA1UdIARV
# MFMwUQYMKwYBBAGCN0yDfQEBMEEwPwYIKwYBBQUHAgEWM2h0dHA6Ly93d3cubWlj
# cm9zb2Z0LmNvbS9wa2lvcHMvRG9jcy9SZXBvc2l0b3J5Lmh0bTATBgNVHSUEDDAK
# BggrBgEFBQcDCDAZBgkrBgEEAYI3FAIEDB4KAFMAdQBiAEMAQTALBgNVHQ8EBAMC
# AYYwDwYDVR0TAQH/BAUwAwEB/zAfBgNVHSMEGDAWgBTV9lbLj+iiXGJo0T2UkFvX
# zpoYxDBWBgNVHR8ETzBNMEugSaBHhkVodHRwOi8vY3JsLm1pY3Jvc29mdC5jb20v
# cGtpL2NybC9wcm9kdWN0cy9NaWNSb29DZXJBdXRfMjAxMC0wNi0yMy5jcmwwWgYI
# KwYBBQUHAQEETjBMMEoGCCsGAQUFBzAChj5odHRwOi8vd3d3Lm1pY3Jvc29mdC5j
# b20vcGtpL2NlcnRzL01pY1Jvb0NlckF1dF8yMDEwLTA2LTIzLmNydDANBgkqhkiG
# 9w0BAQsFAAOCAgEAnVV9/Cqt4SwfZwExJFvhnnJL/Klv6lwUtj5OR2R4sQaTlz0x
# M7U518JxNj/aZGx80HU5bbsPMeTCj/ts0aGUGCLu6WZnOlNN3Zi6th542DYunKmC
# VgADsAW+iehp4LoJ7nvfam++Kctu2D9IdQHZGN5tggz1bSNU5HhTdSRXud2f8449
# xvNo32X2pFaq95W2KFUn0CS9QKC/GbYSEhFdPSfgQJY4rPf5KYnDvBewVIVCs/wM
# nosZiefwC2qBwoEZQhlSdYo2wh3DYXMuLGt7bj8sCXgU6ZGyqVvfSaN0DLzskYDS
# PeZKPmY7T7uG+jIa2Zb0j/aRAfbOxnT99kxybxCrdTDFNLB62FD+CljdQDzHVG2d
# Y3RILLFORy3BFARxv2T5JL5zbcqOCb2zAVdJVGTZc9d/HltEAY5aGZFrDZ+kKNxn
# GSgkujhLmm77IVRrakURR6nxt67I6IleT53S0Ex2tVdUCbFpAUR+fKFhbHP+Crvs
# QWY9af3LwUFJfn6Tvsv4O+S3Fb+0zj6lMVGEvL8CwYKiexcdFYmNcP7ntdAoGokL
# jzbaukz5m/8K6TT4JDVnK+ANuOaMmdbhIurwJ0I9JZTmdHRbatGePu1+oDEzfbzL
# 6Xu/OHBE0ZDxyKs6ijoIYn/ZcGNTTY3ugm2lBRDBcQZqELQdVTNYs6FwZvKhggNN
# MIICNQIBATCB+aGB0aSBzjCByzELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hp
# bmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jw
# b3JhdGlvbjElMCMGA1UECxMcTWljcm9zb2Z0IEFtZXJpY2EgT3BlcmF0aW9uczEn
# MCUGA1UECxMeblNoaWVsZCBUU1MgRVNOOjg2MDMtMDVFMC1EOTQ3MSUwIwYDVQQD
# ExxNaWNyb3NvZnQgVGltZS1TdGFtcCBTZXJ2aWNloiMKAQEwBwYFKw4DAhoDFQBT
# b+bKOPAjCBflhzw5EXBuSWxeDqCBgzCBgKR+MHwxCzAJBgNVBAYTAlVTMRMwEQYD
# VQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNy
# b3NvZnQgQ29ycG9yYXRpb24xJjAkBgNVBAMTHU1pY3Jvc29mdCBUaW1lLVN0YW1w
# IFBDQSAyMDEwMA0GCSqGSIb3DQEBCwUAAgUA7X7mjzAiGA8yMDI2MDQwNzAyMTIz
# MVoYDzIwMjYwNDA4MDIxMjMxWjB0MDoGCisGAQQBhFkKBAExLDAqMAoCBQDtfuaP
# AgEAMAcCAQACAgnUMAcCAQACAhLHMAoCBQDtgDgPAgEAMDYGCisGAQQBhFkKBAIx
# KDAmMAwGCisGAQQBhFkKAwKgCjAIAgEAAgMHoSChCjAIAgEAAgMBhqAwDQYJKoZI
# hvcNAQELBQADggEBAGGHBlQdNU4jYwR/3bK5RuQYfoLmZwF3xXG2j32CzQTO2Lmk
# VEqKndJZe+gMtTkxj5ZkTJZCvOaQjW6gHJpvtHk/LfCae3T5yn4+yTGo55/yG5OB
# Ut2ERILiZTBobgcanrE6qpQgrj5SEjbfeKln4Yqc0F1E6PCGTX3E46JaPzLyMGZZ
# lREhsfV0CJEOMIekV4TVECxx2pQHJMgHS7INWw2NP09Bhsr+7Zf9HSMl5+pJ3jKQ
# pAfb4Xi/YeoEa6fm7aimMTOUwfiWluXG5jYDKMt0MTFg3wxlGTJaCYdJ7vC9uSQ+
# mUm5qBbZ8QYKjFztiJaOc6e2ft1nIvif1iUuzA0xggQNMIIECQIBATCBkzB8MQsw
# CQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9u
# ZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSYwJAYDVQQDEx1NaWNy
# b3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAxMAITMwAAAiWAxzfGzap3SQABAAACJTAN
# BglghkgBZQMEAgEFAKCCAUowGgYJKoZIhvcNAQkDMQ0GCyqGSIb3DQEJEAEEMC8G
# CSqGSIb3DQEJBDEiBCCDfq2oC0MKnNobcPfPBRCXKP4dBHqshal5Bhxky3BuxTCB
# +gYLKoZIhvcNAQkQAi8xgeowgecwgeQwgb0EIFYN7oh6ON3y92CmAl/lF0CYwrjW
# WQP6dCUxajPSHKEQMIGYMIGApH4wfDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldh
# c2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBD
# b3Jwb3JhdGlvbjEmMCQGA1UEAxMdTWljcm9zb2Z0IFRpbWUtU3RhbXAgUENBIDIw
# MTACEzMAAAIlgMc3xs2qd0kAAQAAAiUwIgQgd654QxwHRzBMHRnq4TBWDKPNVZmg
# apZLIbTTalSwffYwDQYJKoZIhvcNAQELBQAEggIAc8oHPEk7AssskHLR1nRnQRnm
# HOuZe5phKwQj4l13QJEsjklZsovEjB7TigNum5hRJ0/7Kv9cehp7Yk1xAXmmT18E
# MCYNdbh7ItG+MI1PZ+a6hFS6Trc4pmkKG1PrzbqpS/PMrD4JoipsfO1i0GgGY60c
# 3oQJ19MOcmsUaIc/ZTBjvmYsZ3tJKzZlFJZPPe0wJvjHYACYUR1jBkc1BmPvOgHu
# TKigw1hi/OmgCcAWMPmIMC7eZ1HuvBGoVOl+blk2aLr49+qhF6tNgLDveHtmT619
# W6pKFnG5wZznJgrSaocCh/8QOrp6ZyxYZvskjgaukL1fy28hF/fF255VE1xNN7uI
# lw9xYtPEyutC69j41M/gCiaq7rZ17XOzH0RatmoXo9x4GMQwmCoKuVpTHDUxwbo2
# L3Es4iO+3HdeXWwdFc9BO2F94EdQ2GG8u1cOQqWh1Bqhp+MZu/X6UauS6EenrVvG
# 8SL23taqhlB3HOG+ny18dwbRiqF2nH9AWDq4eGxZSJu1u99pCCVZXcZ10974LsLO
# Ek9DLwcasDNvTnOEoTBhhA7ki+G0TrHZEtT/Ku8ppml6acdtdM2wVZPOG+AbuhzH
# 9T2Um0ze5bKaiJSGgbS9owLM+5ScxXn79t0U5I+IbECCe992CjuI5tmgM+N21T4F
# qspimqHk3S+ZRHHhbZs=
# SIG # End Windows Authenticode signature block
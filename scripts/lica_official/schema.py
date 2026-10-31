"""Validator for every keyword present in the pinned Adobe schema.

This helper contains no LICA conversion logic. Unknown schema keywords fail
explicitly, so a newer schema cannot silently weaken the assertions.
"""
import math


ANNOTATIONS = {"$schema", "$id", "title", "description", "default"}
KEYWORDS = ANNOTATIONS | {
    "$ref", "$defs", "type", "required", "additionalProperties", "properties",
    "minimum", "maximum", "enum", "const", "minItems", "items", "allOf", "if", "then",
}


def assert_schema_valid(value, schema):
    def audit(node):
        unknown = set(node) - KEYWORDS
        if unknown:
            raise ValueError(f"Unimplemented schema keywords: {sorted(unknown)}")
        for key in ("$defs", "properties"):
            for child in node.get(key, {}).values():
                audit(child)
        for key in ("items", "if", "then"):
            if key in node:
                audit(node[key])
        for child in node.get("allOf", []):
            audit(child)
        if "additionalProperties" in node and not isinstance(node["additionalProperties"], bool):
            raise ValueError("Only boolean additionalProperties is used by the pinned schema")

    def is_type(item, kind):
        numeric = isinstance(item, (int, float)) and not isinstance(item, bool) and math.isfinite(item)
        return {
            "object": isinstance(item, dict), "array": isinstance(item, list),
            "string": isinstance(item, str), "number": numeric,
            "integer": numeric and int(item) == item,
            "null": item is None,
        }[kind]

    def check(item, node, path):
        problems = []
        if "$ref" in node:
            reference = node["$ref"]
            if not reference.startswith("#/"):
                raise ValueError(f"Only local schema references are supported: {reference}")
            resolved = schema
            for token in reference[2:].split("/"):
                resolved = resolved[token.replace("~1", "/").replace("~0", "~")]
            problems.extend(check(item, resolved, path))
        if "type" in node:
            kinds = node["type"] if isinstance(node["type"], list) else [node["type"]]
            if not any(is_type(item, kind) for kind in kinds):
                return problems + [f"{path}: expected {kinds}, got {item!r}"]
        if "enum" in node and item not in node["enum"]:
            problems.append(f"{path}: not in enum {node['enum']}")
        if "const" in node and item != node["const"]:
            problems.append(f"{path}: expected constant {node['const']!r}")
        if isinstance(item, (int, float)) and not isinstance(item, bool):
            for name, bad in (("minimum", lambda bound: item < bound),
                              ("maximum", lambda bound: item > bound)):
                if name in node and bad(node[name]):
                    problems.append(f"{path}: violates {name} {node[name]}")
        if isinstance(item, dict):
            for name in node.get("required", []):
                if name not in item:
                    problems.append(f"{path}: missing required {name}")
            props = node.get("properties", {})
            if node.get("additionalProperties") is False:
                for name in set(item) - set(props):
                    problems.append(f"{path}: unexpected property {name}")
            for name, child in props.items():
                if name in item:
                    problems.extend(check(item[name], child, f"{path}.{name}"))
        if isinstance(item, list):
            if len(item) < node.get("minItems", 0):
                problems.append(f"{path}: too few items")
            if "items" in node:
                for index, child in enumerate(item):
                    problems.extend(check(child, node["items"], f"{path}[{index}]"))
        for child in node.get("allOf", []):
            problems.extend(check(item, child, path))
        if "if" in node and not check(item, node["if"], path):
            if "then" in node:
                problems.extend(check(item, node["then"], path))
        return problems

    audit(schema)
    problems = check(value, schema, "design")
    if problems:
        raise AssertionError("\n".join(problems))

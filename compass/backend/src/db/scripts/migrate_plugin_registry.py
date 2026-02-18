"""
Migrate plugins_config_v2 -> plugin_registry

Flattens admin_config JSON into real columns:
  - plugin_name
  - description
  - instructions

Adds routing and plugin behavior columns:
  - service_key
  - service_type
  - user_inputs
  - conversation_seed

Paste into a single Databricks notebook cell and run.
Adjust CATALOG/SCHEMA for your environment.
"""

from pyspark.sql import functions as F
from pyspark.sql.types import StringType

# -- Config ----------------------------------------------------------------
CATALOG = "devctzndsa"
SCHEMA = "compass"
SOURCE_TABLE = f"{CATALOG}.{SCHEMA}.plugins_config_v2"
TARGET_TABLE = f"{CATALOG}.{SCHEMA}.plugin_registry"

# -- Read source -----------------------------------------------------------
source_df = spark.table(SOURCE_TABLE)
print(f"Source rows: {source_df.count()}")
source_df.printSchema()

# -- Transform -------------------------------------------------------------
migrated_df = (
    source_df
    .withColumn(
        "_parsed",
        F.from_json(
            F.col("admin_config"),
            "plugin_name STRING, plugin_description STRING, instructions STRING",
        ),
    )
    .withColumn("plugin_name", F.coalesce(F.col("_parsed.plugin_name"), F.col("plugin_id")))
    .withColumn("description", F.coalesce(F.col("_parsed.plugin_description"), F.lit("")))
    .withColumn("instructions", F.coalesce(F.col("_parsed.instructions"), F.lit("")))
    .withColumn("service_key", F.lit(None).cast(StringType()))
    .withColumn("service_type", F.lit(None).cast(StringType()))
    .withColumn("user_inputs", F.lit(None).cast(StringType()))
    .withColumn("conversation_seed", F.lit(None).cast(StringType()))
    .select(
        "plugin_id", "plugin_name", "workspace_id", "workspace_name",
        "description", "workspace_description", "position", "enabled",
        "instructions",
        "conversation_seed", "user_inputs",
        "service_key", "service_type",
        "plugin_type",
        "updated_by", "created_at", "updated_at",
    )
)

# -- Preview ---------------------------------------------------------------
migrated_df.select(
    "plugin_id", "plugin_name", "workspace_id",
    "description", "instructions", "service_key",
).show(10, truncate=60)

# -- Write -----------------------------------------------------------------
migrated_df.write.format("delta").mode("overwrite").option("overwriteSchema", "true").saveAsTable(TARGET_TABLE)
print(f"Created {TARGET_TABLE} with {migrated_df.count()} rows")

# -- Verify ----------------------------------------------------------------
result_df = spark.table(TARGET_TABLE)
result_df.printSchema()
display(result_df)

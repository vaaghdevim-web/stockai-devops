import os
import time
import json
import queue

import paho.mqtt.client as mqtt
import psycopg2

from prometheus_client import start_http_server, Gauge, Counter


# ============================================================
# MQTT CONFIGURATION
# ============================================================

MQTT_HOST = os.getenv("MQTT_HOST", "stockai-mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", "8883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "stockai")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD")


# ============================================================
# TIMESCALEDB CONFIGURATION
# ============================================================

DB_HOST = os.getenv("DB_HOST", "host.docker.internal")
DB_PORT = int(os.getenv("DB_PORT", "5433"))
DB_NAME = os.getenv("DB_NAME", "telemetry")
DB_USERNAME = os.getenv("DB_USERNAME", "telemetry")
DB_PASSWORD = os.getenv("DB_PASSWORD")


# ============================================================
# PROMETHEUS METRICS
# ============================================================

TEMPERATURE = Gauge(
    "stockai_sensor_temperature",
    "Current sensor temperature",
    ["sensor_id"]
)

TELEMETRY_SAVED = Counter(
    "stockai_telemetry_saved_total",
    "Number of telemetry records successfully saved to TimescaleDB"
)

MQTT_PUBLISHED = Counter(
    "stockai_mqtt_published_total",
    "Number of telemetry messages successfully published to MQTT"
)


# ============================================================
# START PROMETHEUS METRICS SERVER
# ============================================================

PROMETHEUS_PORT = int(
    os.getenv("PROMETHEUS_PORT", "8000")
)

start_http_server(PROMETHEUS_PORT)

print(
    f"Prometheus metrics server started on port "
    f"{PROMETHEUS_PORT}"
)


# ============================================================
# RETRY QUEUE
# ============================================================

retry_queue = queue.Queue()


# ============================================================
# SAVE TELEMETRY TO TIMESCALEDB
# ============================================================

def save_to_timescaledb(payload):

    try:

        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USERNAME,
            password=DB_PASSWORD
        )

        cursor = conn.cursor()

        cursor.execute(
            """
            INSERT INTO sensor_telemetry
                (time, sensor_id, temperature)
            VALUES
                (to_timestamp(%s), %s, %s)
            """,
            (
                payload["timestamp"],
                payload["sensor_id"],
                payload["temperature"]
            )
        )

        conn.commit()

        cursor.close()
        conn.close()

        TELEMETRY_SAVED.inc()

        print(
            "Telemetry saved to TimescaleDB:",
            payload
        )

        return True

    except Exception as e:

        print(
            "TimescaleDB insert failed:",
            e
        )

        return False


# ============================================================
# PUBLISH TELEMETRY TO MQTT
# ============================================================

def publish_telemetry(client, payload):

    try:

        result = client.publish(
            "stockai/telemetry",
            json.dumps(payload)
        )

        if result.rc == mqtt.MQTT_ERR_SUCCESS:

            MQTT_PUBLISHED.inc()

            print(
                "Telemetry published:",
                payload
            )

            return True

        print(
            "Publish failed. Adding to retry queue:",
            payload
        )

        retry_queue.put(payload)

        return False

    except Exception as e:

        print(
            "MQTT unavailable:",
            e
        )

        retry_queue.put(payload)

        return False


# ============================================================
# RETRY PENDING MQTT MESSAGES
# ============================================================

def retry_pending(client):

    while not retry_queue.empty():

        payload = retry_queue.get()

        try:

            result = client.publish(
                "stockai/telemetry",
                json.dumps(payload)
            )

            if result.rc == mqtt.MQTT_ERR_SUCCESS:

                MQTT_PUBLISHED.inc()

                print(
                    "Retry successful:",
                    payload
                )

            else:

                print(
                    "Retry failed. Keeping message:",
                    payload
                )

                retry_queue.put(payload)

                break

        except Exception as e:

            print(
                "Retry connection failed:",
                e
            )

            retry_queue.put(payload)

            break


# ============================================================
# MQTT CLIENT
# ============================================================

client = mqtt.Client(
    mqtt.CallbackAPIVersion.VERSION2
)


# MQTT username/password authentication

client.username_pw_set(
    MQTT_USERNAME,
    MQTT_PASSWORD
)


# MQTT TLS configuration

client.tls_set(
    ca_certs="/certs/ca.crt"
)


# ============================================================
# START MQTT CONNECTION
# ============================================================

print(
    f"Connecting to MQTT broker "
    f"{MQTT_HOST}:{MQTT_PORT}..."
)


# ============================================================
# MAIN LOOP
# ============================================================

while True:

    try:

        # ----------------------------------------------------
        # CONNECT TO MQTT
        # ----------------------------------------------------

        if not client.is_connected():

            client.connect(
                MQTT_HOST,
                MQTT_PORT,
                keepalive=60
            )

            client.loop_start()

            print(
                "Connected to MQTT broker"
            )


        # ----------------------------------------------------
        # GENERATE TELEMETRY
        # ----------------------------------------------------

        telemetry = {

            "sensor_id": "sensor-001",

            "temperature": 25.4,

            "timestamp": int(time.time())

        }


        # ----------------------------------------------------
        # UPDATE PROMETHEUS TEMPERATURE METRIC
        # ----------------------------------------------------

        TEMPERATURE.labels(
            sensor_id=telemetry["sensor_id"]
        ).set(
            telemetry["temperature"]
        )


        # ----------------------------------------------------
        # SAVE TELEMETRY TO TIMESCALEDB
        # ----------------------------------------------------

        db_saved = save_to_timescaledb(
            telemetry
        )


        # ----------------------------------------------------
        # PUBLISH TELEMETRY TO MQTT
        # ----------------------------------------------------

        mqtt_published = publish_telemetry(
            client,
            telemetry
        )


        # ----------------------------------------------------
        # RETRY FAILED MQTT MESSAGES
        # ----------------------------------------------------

        retry_pending(
            client
        )


        # ----------------------------------------------------
        # STATUS
        # ----------------------------------------------------

        print(
            f"Telemetry status | "
            f"TimescaleDB: {db_saved} | "
            f"MQTT: {mqtt_published}"
        )


        # Wait 10 seconds before next telemetry

        time.sleep(10)


    # ========================================================
    # CONNECTION / RUNTIME ERROR
    # ========================================================

    except Exception as e:

        print(
            "Runtime error:",
            e
        )


        # Create telemetry record for retry

        telemetry = {

            "sensor_id": "sensor-001",

            "temperature": 25.4,

            "timestamp": int(time.time())

        }


        retry_queue.put(
            telemetry
        )


        print(
            "Telemetry added to retry queue"
        )


        time.sleep(10)

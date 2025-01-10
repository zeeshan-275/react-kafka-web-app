# Project Services
DGX_IP_ADDRESS = "192.168.12.1"

PROJECT_SERVICES_PORT = [
    6385, 19000, 19001,     # InsightFace
    19530,                  # Milvus Vector Database
    9092,                   # Kafka Broker
    6381,                   # Redis Database
    20001,                  # Database-Controller
    20012,                  # Kafka-Message-Controller
    20013,                  # Display-Image-Server
    6386, 6970, 6971        # Face Liveness Detection
]

# Kafka IP and Port
CONFLUENT_KAFKA_IP_ADDRESS = DGX_IP_ADDRESS
CONFLUENT_KAFKA_PORT = 9092

# Kafka topic for messages
#CONFLUENT_KAFKA_TOPIC = 'feedback_messages_topic_for_library-gate'
CONFLUENT_KAFKA_TOPIC = 'main-gate_entry'


# Number of names to be displayed at once
DISPLAY_LIST_SIZE = 6

# Message Retention time on Screen
STATUS_THRESHOLD = 15

# Image Server Address
IMAGE_SERVER_ADDRESS = f"http://{DGX_IP_ADDRESS}:20013/post_images"

# Number of times to check for network failure
NETWORK_FAIL_CHECK = 10

# Logs directory path
LOGS_FOLDER = "logs"

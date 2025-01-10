import socket
import threading
import time
import json
import requests
import random
from confluent_kafka import Consumer
from flask import Flask, render_template, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from custom_logging import feedback_client_logger
from parameters import CONFLUENT_KAFKA_IP_ADDRESS, \
    CONFLUENT_KAFKA_PORT, \
    CONFLUENT_KAFKA_TOPIC, \
    DISPLAY_LIST_SIZE, \
    IMAGE_SERVER_ADDRESS, \
    STATUS_THRESHOLD, \
    DGX_IP_ADDRESS, \
    NETWORK_FAIL_CHECK, \
    PROJECT_SERVICES_PORT


app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

# Kafka configuration
kafka_conf = {
    'bootstrap.servers': f'{CONFLUENT_KAFKA_IP_ADDRESS}:{CONFLUENT_KAFKA_PORT}',
    'group.id': 'face_recognition_feedback_message_consumer_group',
    'auto.offset.reset': 'latest',
    'enable.auto.commit': True,
    'session.timeout.ms': 6000,
    'heartbeat.interval.ms': 2000
}

# Create a queue to store messages from kafka
message_queue = []
# Create a queue for the messages to display
messages_to_display = []
# Keep track of last message update time
last_update_time = time.time()
# Flags to keep track of the ERROR and SUCCESS messages sent
connection_failure_message_sent = False
project_services_down_message_sent = False
successful_reconnection_message_sent = not connection_failure_message_sent
project_restart_message_sent = not project_services_down_message_sent

# initialize a kafka_consumer
kafka_consumer = None
# print(f"\nINITIAL STAGE OF KAFKA CONSUMER: {kafka_consumer}\n")


def ping_server(ip: str, port: int):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.5)
        sock.connect((ip, port))
        return True
    except socket.error:
        return False


def ping_project_services() -> bool:
    ping_status = []
    for service_port in PROJECT_SERVICES_PORT:
        ping_status.append(ping_server(DGX_IP_ADDRESS, service_port))

    return all(ping_status)


def post_message_queue_and_get_images(data):
    global messages_to_display
    try:
        response = requests.post(IMAGE_SERVER_ADDRESS, data=data)
        if response.status_code == 200:
            messages_to_display = response.json()
            # print(f"\n MESSAGES TO DISPLAY: {messages_to_display}\n")
        else:
            print(f"Status Code: {response.status_code}, Message: {response.reason}")
    except Exception as e:
        print(f"Exception occurred while posting data: {str(e)}")


def consume_messages():
    global message_queue, last_update_time, messages_to_display, connection_failure_message_sent, project_services_down_message_sent, successful_reconnection_message_sent, project_restart_message_sent
    global kafka_consumer

    server_ping_fail = 0
    services_ping_fail = 0

    while True:
        is_dgx_reachable = ping_server(DGX_IP_ADDRESS, 22)
        # print(f"DGX Reachable: {is_dgx_reachable}")
        are_services_running = ping_project_services()
        # print(f"Project Running: {are_services_running}")

        if is_dgx_reachable:
            server_ping_fail = 0
            if not successful_reconnection_message_sent:
                message_queue = []
                messages_to_display = []
                message = "🛜 Network Reconnection Successful 🛜"
                socketio.emit('new_message', {'message': [{'SUCCESS': message}]})
                successful_reconnection_message_sent = True
                connection_failure_message_sent = False
                feedback_client_logger.info("Network Reconnection Successful")
                # print(f"\n{message}\n")

            if are_services_running:
                services_ping_fail = 0
                if not project_restart_message_sent:
                    message_queue = []
                    messages_to_display = []
                    message = "✅ Facial Recognition Attendance System is Getting Started. Please Wait for 2 Minutes ✅"
                    socketio.emit('new_message', {'message': [{'SUCCESS': message}]})
                    feedback_client_logger.info("Facial Recognition Attendance System is Getting Started. Please Wait for 2 Minutes")
                    # print(f"\n{message}\n")
                    time.sleep(1 * 60)

                    message = "Facial Recognition Attendance System Has Been Started. Please Resume Attendance"
                    socketio.emit('new_message', {'message': [{'SUCCESS': message}]})
                    feedback_client_logger.info(message)
                    # print(f"\n{message}\n")

                    project_restart_message_sent = True
                    project_services_down_message_sent = False

                    time.sleep(5)

                if kafka_consumer is None:
                    # Create a Kafka Consumer
                    kafka_consumer = Consumer(kafka_conf)
                    kafka_consumer.subscribe([CONFLUENT_KAFKA_TOPIC])
                    feedback_client_logger.info("Created a fresh kafka consumer")

                # print(f"\nKAFKA CONSUMER AFTER SUCCESSFUL START OF THE PROJECT: {kafka_consumer}\n")

                message_from_kafka = kafka_consumer.poll(0.2)

                if message_from_kafka is None:
                    pass
                    # print("No message received.")
                else:
                    # Check if it is not an error message sent by Kafka
                    # print(f"\nRAW MESSAGE FROM KAFKA: {message_from_kafka}\n")
                    if message_from_kafka.error():
                        # Clear existing messages
                        message_queue = []
                        feedback_client_logger.error(f"Received an error message from kafka: {message_from_kafka.error()}")
                        # while kafka_consumer.poll() is None:
                        #     continue
                    else:
                        decoded_kafka_message = message_from_kafka.value().decode()
                        print(f"\nMESSAGE RECEIVED FROM KAFKA: {decoded_kafka_message}\n")
                        # Check if coming message is an ERROR message or SUCCESS message
                        if decoded_kafka_message.split(": ")[0].startswith("ERROR") or decoded_kafka_message.split(": ")[0].startswith("SUCCESS"):
                            message_key, message_value = decoded_kafka_message.split(": ")
                            # message_queue = []
                            # print(message_queue)
                            # message_queue.insert(0, decoded_kafka_message)
                            # print(message_queue)
                            message_data_to_send = {message_key: message_value}
                            socketio.emit('new_message', {'message': [message_data_to_send]})
                            # print(message_data_to_send)
                            # data = json.dumps(message_data_to_send)
                            # post_message_queue_and_get_images(data)
                            # message_queue = []
                            # print(message_queue)
                        else:
                            if decoded_kafka_message not in message_queue:
                                if len(message_queue) >= DISPLAY_LIST_SIZE:
                                    message_queue.pop()
                                # print(message_queue)
                                message_queue.insert(0, decoded_kafka_message)
                                print("Rec Data", message_queue)
                                message_data_to_send = {"messages": message_queue}
                                data = json.dumps(message_data_to_send)
                                post_message_queue_and_get_images(data)
                                last_update_time = time.time()
            else:
                services_ping_fail += 1

                if services_ping_fail >= NETWORK_FAIL_CHECK and not project_services_down_message_sent:
                    message_queue = []
                    messages_to_display = []
                    message = "⚠️ Facial Recognition System Temporarily Down for Maintenance or Due to an Unexpected Issue ⚠️"
                    socketio.emit('new_message', {'message': [{'ERROR': message}]})
                    project_services_down_message_sent = True
                    project_restart_message_sent = False
                    feedback_client_logger.error("Facial Recognition System Temporarily Down for Maintenance or Due to an Unexpected Issue")
                    print(f"\n{message}\n")

                    if kafka_consumer is not None:
                        kafka_consumer = None
                        feedback_client_logger.warn("Deleted Kafka Consumer as the facial recognition system shutdown.")

                    # print(f"\nKAFKA CONSUMER STATUS IF PROJECT DOWN: {kafka_consumer}\n")

                    services_ping_fail = 0

        else:
            server_ping_fail += 1

            if server_ping_fail >= NETWORK_FAIL_CHECK and not connection_failure_message_sent:
                message_queue = []
                messages_to_display = []
                message = "⚠️ Network Issue: Unable to Connect to the Server ⚠️"
                socketio.emit('new_message', {'message': [{'ERROR': message}]})
                connection_failure_message_sent = True
                successful_reconnection_message_sent = False
                project_services_down_message_sent = False
                feedback_client_logger.error("Network Issue: Unable to Connect to the Server")
                print(f"\n{message}\n")

                if kafka_consumer is not None:
                    kafka_consumer = None
                    feedback_client_logger.warn("Deleted Kafka Consumer as the server is not reachable.")

                # print(f"\nKAFKA CONSUMER STATUS IF SERVER NOT CONNECTED: {kafka_consumer}\n")

                server_ping_fail = 0

        if time.time() - last_update_time >= STATUS_THRESHOLD:
            message_queue = []
            # print(message_queue)
            messages_to_display = []
            socketio.emit('new_message', {'message': messages_to_display})
            last_update_time = time.time()


kafka_consumer_thread = threading.Thread(target=consume_messages)
kafka_consumer_thread.daemon = True
kafka_consumer_thread.start()

def generate_random_messages():
    global messages_to_display
    cameras = [
        "abesit-main-gate-cam-1",
        "abesit-main-gate-cam-2",
        "abesit-main-gate-cam-3",
        "abesit-main-gate-cam-4",
        "abesit-main-gate-cam-5"
    ]
    message_types = ["SUCCESS", "ERROR"]
    random_messages_to_display = []

    # Generate system error/success messages
    # num_system_messages = random.randint(1, 2)  # Generate 1 or 2 system messages
    # for _ in range(num_system_messages):
    #     msg_type = random.choice(message_types)
    #     message_text = f"System {msg_type.lower()}: {random.choice(['Network issue', 'System restarting', 'System operational'])}"
    #     message_entry = {msg_type: message_text}
    #     random_messages_to_display.append(message_entry)

    num_camera_messages = random.randint(1, 5)  # Generate 1 to 3 camera messages
    for _ in range(num_camera_messages):
        camera = random.choice(cameras)
        msg_type = random.choice(message_types)
        message_text = f"{camera} {random.choice(['Camera disconnected', 'Camera reconnected', 'Camera operational'])}"
        message_entry = {f"{msg_type} {camera}": message_text}
        random_messages_to_display.append(message_entry)

    num_normal_messages = random.randint(1, 5)
    for _ in range(num_normal_messages):
        message_id = f"ID{random.randint(1000000, 9999999)}"
        # message_id = 'XYZ123456'
        img_str = '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'
        random_messages_to_display.append({message_id: img_str})

    # messages_to_display = random_messages_to_display

def schedule_random_messages():
    while True:
        interval = random.randint(3,10)
        time.sleep(interval)
        generate_random_messages()

thread = threading.Thread(target=schedule_random_messages)
thread.daemon = True
thread.start()

@app.route('/api/messages', methods=['GET'])
def get_messages():
    global messages_to_display
    print("from Route: ")
    return jsonify({'message': messages_to_display})

@socketio.on('connect')
def handle_connect():
    global messages_to_display
    print("Client connected :")
    emit('new_message', {'message': messages_to_display})


@socketio.on('check_updates')
def handle_check_updates():
    global messages_to_display
    print("Check Updates: ", len(messages_to_display))
    emit('new_message', {'message': messages_to_display})

if __name__ == "__main__":
    socketio.run(host="0.0.0.0", port=9090)
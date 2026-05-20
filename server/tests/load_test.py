# pyright: reportMissingImports=false
import random

from locust import HttpUser, between, events, task


class ChatUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        self.user_id = f"user_{random.randint(1000, 9999)}"

    @task(10)
    def chat_message(self):
        messages = [
            "你好",
            "我想了解一下水光针",
            "多少钱？",
            "可以预约吗？",
            "营业时间是什么时候？",
            "地址在哪里？",
            "有什么优惠吗？",
        ]
        self.client.post(
            "/api/chat/message",
            json={
                "message": random.choice(messages),
                "history": [],
                "user_id": self.user_id
            }
        )

    @task(5)
    def chat_with_context(self):
        self.client.post(
            "/api/chat/message",
            json={
                "message": "我想补水",
                "history": [
                    {"role": "user", "content": "你好"},
                    {"role": "assistant", "content": "您好！有什么可以帮助您的吗？"}
                ],
                "user_id": self.user_id,
                "context": {"products": ["水光针", "玻尿酸"]}
            }
        )

    @task(3)
    def cached_response(self):
        self.client.post(
            "/api/chat/message",
            json={
                "message": "你好",
                "history": []
            }
        )


class AppointmentUser(HttpUser):
    wait_time = between(2, 5)

    @task(5)
    def create_appointment(self):
        self.client.post(
            "/api/appointments/",
            json={
                "name": f"用户{random.randint(1000, 9999)}",
                "phone": f"138{random.randint(10000000, 99999999)}",
                "service_type": random.choice(["水光针", "玻尿酸", "光子嫩肤", None])
            }
        )

    @task(2)
    def list_appointments(self):
        self.client.get("/api/appointments/")


class MetricsUser(HttpUser):
    wait_time = between(10, 30)

    @task(1)
    def check_cache_stats(self):
        self.client.get("/api/chat/cache/stats")

    @task(1)
    def check_router_metrics(self):
        self.client.get("/api/chat/metrics")

    @task(1)
    def check_health(self):
        self.client.get("/health")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("Performance test starting...")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("Performance test completed")
    print(f"Total requests: {environment.stats.total.num_requests}")
    print(f"Failures: {environment.stats.total.num_failures}")
    print(f"Average response time: {environment.stats.total.avg_response_time:.2f}ms")

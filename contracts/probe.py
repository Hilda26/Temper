# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *


class TemperProbe(gl.Contract):
    # Scalar storage
    owner: Address
    total_deposits: u256
    last_message: str
    is_active: bool
    operation_count: u256

    # Collection storage
    deposit_balances: TreeMap[Address, u256]
    withdrawal_log: DynArray[str]
    tags: TreeMap[str, u256]

    # Non-deterministic results
    last_fetch_result: str
    last_fetch_status: u256

    # Idempotency tracking
    processed_nonces: TreeMap[u256, bool]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.total_deposits = u256(0)
        self.last_message = ""
        self.is_active = True
        self.operation_count = u256(0)

    # ── Payable deposit ──

    @gl.public.write.payable
    def deposit(self) -> None:
        sender = gl.message.sender_address
        value = gl.message.value
        if int(value) == 0:
            raise gl.vm.UserError("zero deposit")
        current = self.deposit_balances[sender]
        self.deposit_balances[sender] = u256(int(current) + int(value))
        self.total_deposits = u256(int(self.total_deposits) + int(value))
        self.operation_count = u256(int(self.operation_count) + 1)

    # ── Value withdrawal via emit_transfer ──

    @gl.public.write
    def withdraw(self, amount: u256) -> None:
        sender = gl.message.sender_address
        current = self.deposit_balances[sender]
        if int(current) < int(amount):
            raise gl.vm.UserError("insufficient balance")
        if int(amount) == 0:
            raise gl.vm.UserError("zero withdrawal")
        self.deposit_balances[sender] = u256(int(current) - int(amount))
        self.total_deposits = u256(int(self.total_deposits) - int(amount))
        gl.contract.get_at(Address(sender)).emit_transfer(value=amount)
        self.operation_count = u256(int(self.operation_count) + 1)

    # ── Scalar writes ──

    @gl.public.write
    def set_message(self, msg: str) -> None:
        self.last_message = msg
        self.operation_count = u256(int(self.operation_count) + 1)

    @gl.public.write
    def set_active(self, active: bool) -> None:
        self.is_active = active

    # ── DynArray append ──

    @gl.public.write
    def add_log_entry(self, entry: str) -> None:
        self.withdrawal_log.append(entry)
        self.operation_count = u256(int(self.operation_count) + 1)

    # ── TreeMap with string keys ──

    @gl.public.write
    def set_tag(self, key: str, value: u256) -> None:
        self.tags[key] = value

    # ── Idempotency guard ──

    @gl.public.write
    def idempotent_action(self, nonce: u256) -> None:
        if self.processed_nonces[nonce]:
            raise gl.vm.UserError("already processed")
        self.processed_nonces[nonce] = True
        self.operation_count = u256(int(self.operation_count) + 1)

    # ── Non-deterministic web fetch with consensus ──

    @gl.public.write
    def fetch_url(self, url: str) -> None:
        def do_fetch():
            result = gl.nondet.web.get(url)
            body = result.body if hasattr(result, 'body') else str(result)
            status_str = "200" if body else "0"
            return status_str + "|" + body[:200] if body else status_str + "|empty"

        result = gl.eq_principle.strict_eq(do_fetch)
        parts = result.split("|", 1)
        self.last_fetch_status = u256(int(parts[0])) if parts[0].isdigit() else u256(0)
        self.last_fetch_result = parts[1] if len(parts) > 1 else ""
        self.operation_count = u256(int(self.operation_count) + 1)

    # ── Read methods ──

    @gl.public.view
    def get_balance_of(self, addr: Address) -> u256:
        return self.deposit_balances[addr]

    @gl.public.view
    def get_contract_balance(self) -> u256:
        return self.balance

    @gl.public.view
    def get_total_deposits(self) -> u256:
        return self.total_deposits

    @gl.public.view
    def get_message(self) -> str:
        return self.last_message

    @gl.public.view
    def get_active(self) -> bool:
        return self.is_active

    @gl.public.view
    def get_operation_count(self) -> u256:
        return self.operation_count

    @gl.public.view
    def get_log_count(self) -> u256:
        return u256(len(self.withdrawal_log))

    @gl.public.view
    def get_log_entry(self, index: u256) -> str:
        return self.withdrawal_log[int(index)]

    @gl.public.view
    def get_tag(self, key: str) -> u256:
        return self.tags[key]

    @gl.public.view
    def get_fetch_result(self) -> str:
        return self.last_fetch_result

    @gl.public.view
    def get_fetch_status(self) -> u256:
        return self.last_fetch_status

    @gl.public.view
    def get_owner(self) -> Address:
        return self.owner

    @gl.public.view
    def is_nonce_processed(self, nonce: u256) -> bool:
        return self.processed_nonces[nonce]

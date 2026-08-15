# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
import time


# -- Status enums as u256 constants --

# Commitment status
C_DRAFT = u256(0)
C_BONDING = u256(1)
C_CAPITALISING = u256(2)
C_ACTIVE = u256(3)
C_WATCH = u256(4)
C_INCIDENT_OPEN = u256(5)
C_SUSPENDED = u256(6)
C_WINDING_DOWN = u256(7)
C_CLOSED = u256(8)

# Observation status
OBS_DUE = u256(0)
OBS_REQUESTED = u256(1)
OBS_CONSENSUS_PENDING = u256(2)
OBS_NOMINAL = u256(3)
OBS_ANOMALY = u256(4)
OBS_FAILED = u256(5)
OBS_STALE = u256(6)

# Incident status
INC_SUSPECTED = u256(0)
INC_EVIDENCE_GATHERING = u256(1)
INC_PROVISIONAL_VERDICT = u256(2)
INC_CHALLENGE_WINDOW = u256(3)
INC_READJUDICATION_PENDING = u256(4)
INC_RESOLVER_PENDING = u256(5)
INC_FINAL = u256(6)
INC_SETTLEMENT_READY = u256(7)
INC_SETTLED = u256(8)
INC_RECOVERED = u256(9)

# Policy status
POL_PENDING_WAIT = u256(0)
POL_ACTIVE = u256(1)
POL_EXPIRED = u256(2)
POL_INCIDENT_LOCKED = u256(3)
POL_PAYOUT_READY = u256(4)
POL_PAID = u256(5)
POL_CANCELLED = u256(6)

# Withdrawal status
WD_NONE = u256(0)
WD_QUEUED = u256(1)
WD_LOCKED_BY_INCIDENT = u256(2)
WD_EXECUTABLE = u256(3)
WD_EXECUTED = u256(4)
WD_CANCELLED = u256(5)

# Severity
SEV_NONE = u256(0)
SEV_WARNING = u256(1)
SEV_MINOR = u256(2)
SEV_MATERIAL = u256(3)
SEV_CRITICAL = u256(4)

# Responsibility
RESP_OPERATOR = u256(0)
RESP_EXTERNAL = u256(1)
RESP_CLAIMANT = u256(2)
RESP_SHARED = u256(3)
RESP_UNKNOWN = u256(4)

# Event status
EVT_NOT_CONFIRMED = u256(0)
EVT_CONFIRMED = u256(1)
EVT_INSUFFICIENT_EVIDENCE = u256(2)
EVT_SOURCE_FAILURE = u256(3)
EVT_CONFLICTING_EVIDENCE = u256(4)

# Template type
TMPL_ENDPOINT = u256(0)
TMPL_ONCHAIN_STATE = u256(1)

# Basis points constants
BPS_MAX = 10000

# Counter-evidence submitted by an operator is only admissible if it originates from a host
# the commitment itself declared at creation time (target or backup). Without this bound an
# operator could point adjudication at a domain they control and manufacture their own acquittal.
MAX_COUNTER_EVIDENCE_URLS = 5


class Temper(gl.Contract):
    # -- Global counters --
    next_commitment_id: u256
    next_policy_id: u256
    next_incident_id: u256
    next_observation_id: u256

    # -- Admin --
    admin: Address
    paused: bool
    protocol_fee_bps: u256
    observer_reward_bps: u256
    protocol_treasury: u256

    # -- Commitment storage (parallel primitive maps) --
    commitment_operator: TreeMap[u256, Address]
    commitment_status: TreeMap[u256, u256]
    commitment_bond: TreeMap[u256, u256]
    commitment_bond_slashed: TreeMap[u256, u256]
    commitment_min_bond: TreeMap[u256, u256]
    commitment_target_url: TreeMap[u256, str]
    commitment_backup_url: TreeMap[u256, str]
    commitment_template: TreeMap[u256, u256]
    commitment_service_name: TreeMap[u256, str]
    commitment_description: TreeMap[u256, str]
    commitment_observation_interval: TreeMap[u256, u256]
    commitment_grace_period: TreeMap[u256, u256]
    commitment_failure_threshold: TreeMap[u256, u256]
    commitment_last_observation_time: TreeMap[u256, u256]
    commitment_consecutive_failures: TreeMap[u256, u256]
    commitment_incident_count: TreeMap[u256, u256]
    commitment_active_incident: TreeMap[u256, u256]
    commitment_version: TreeMap[u256, u256]
    commitment_created_at: TreeMap[u256, u256]
    commitment_activated_at: TreeMap[u256, u256]
    commitment_policy_count: TreeMap[u256, u256]
    commitment_active_policy_count: TreeMap[u256, u256]

    # Slash ladder per severity (JSON string: {"1":0,"2":500,"3":2500,"4":10000})
    commitment_slash_ladder: TreeMap[u256, str]
    # Payout tiers (JSON string: {"0":0,"1":1000,"2":3500,"3":10000} in bps of limit)
    commitment_payout_tiers: TreeMap[u256, str]
    # Coverage config
    commitment_max_policy_limit: TreeMap[u256, u256]
    commitment_min_policy_limit: TreeMap[u256, u256]
    commitment_max_policy_duration: TreeMap[u256, u256]
    commitment_min_policy_duration: TreeMap[u256, u256]
    commitment_base_premium_bps: TreeMap[u256, u256]
    commitment_deductible_bps: TreeMap[u256, u256]
    commitment_waiting_period: TreeMap[u256, u256]
    commitment_challenge_window: TreeMap[u256, u256]
    commitment_max_cumulative_slash_bps: TreeMap[u256, u256]

    # -- Vault storage (per commitment) --
    vault_gross_capital: TreeMap[u256, u256]
    vault_reserved_capital: TreeMap[u256, u256]
    vault_earned_premium: TreeMap[u256, u256]
    vault_pending_claims: TreeMap[u256, u256]
    vault_realised_losses: TreeMap[u256, u256]
    vault_total_shares: TreeMap[u256, u256]

    # -- Underwriter storage (compound key "commitmentId:address_hex") --
    underwriter_shares: TreeMap[str, u256]
    underwriter_deposited: TreeMap[str, u256]
    underwriter_withdrawal_status: TreeMap[str, u256]
    underwriter_withdrawal_shares: TreeMap[str, u256]
    underwriter_withdrawal_time: TreeMap[str, u256]
    underwriter_premium_claimed: TreeMap[str, u256]

    # -- Policy storage --
    policy_commitment: TreeMap[u256, u256]
    policy_holder: TreeMap[u256, Address]
    policy_limit: TreeMap[u256, u256]
    policy_premium_paid: TreeMap[u256, u256]
    policy_start: TreeMap[u256, u256]
    policy_end: TreeMap[u256, u256]
    policy_status: TreeMap[u256, u256]
    policy_claimable: TreeMap[u256, u256]
    policy_claimed: TreeMap[u256, u256]
    policy_deductible: TreeMap[u256, u256]
    policy_version: TreeMap[u256, u256]
    policy_payout_tier: TreeMap[u256, u256]
    policy_incident_id: TreeMap[u256, u256]

    # -- Incident storage --
    incident_commitment: TreeMap[u256, u256]
    incident_status: TreeMap[u256, u256]
    incident_severity: TreeMap[u256, u256]
    incident_event_status: TreeMap[u256, u256]
    incident_responsibility: TreeMap[u256, u256]
    incident_slash_bps: TreeMap[u256, u256]
    incident_slash_amount: TreeMap[u256, u256]
    incident_payout_tier: TreeMap[u256, u256]
    incident_coverage_trigger: TreeMap[u256, u256]
    incident_start_time: TreeMap[u256, u256]
    incident_end_time: TreeMap[u256, u256]
    incident_duration: TreeMap[u256, u256]
    incident_source_hash: TreeMap[u256, str]
    incident_summary: TreeMap[u256, str]
    incident_evidence_quality: TreeMap[u256, str]
    incident_challenger: TreeMap[u256, Address]
    incident_challenge_time: TreeMap[u256, u256]
    incident_counter_evidence_urls: TreeMap[u256, str]
    # Binds submitted counter-evidence to the exact commitment + commitment version it was
    # filed against, so evidence accepted for one commitment can never be replayed into the
    # adjudication of another, or survive a commitment re-versioning.
    incident_counter_evidence_commitment: TreeMap[u256, u256]
    incident_counter_evidence_version: TreeMap[u256, u256]
    incident_readjudication_hash: TreeMap[u256, str]
    incident_finalized_at: TreeMap[u256, u256]
    incident_observation_id: TreeMap[u256, u256]

    # -- Observation storage --
    observation_commitment: TreeMap[u256, u256]
    observation_status: TreeMap[u256, u256]
    observation_window_start: TreeMap[u256, u256]
    observation_window_end: TreeMap[u256, u256]
    observation_result_hash: TreeMap[u256, str]
    observation_triggerer: TreeMap[u256, Address]
    observation_created_at: TreeMap[u256, u256]

    # -- Commitment policy IDs (stored as JSON arrays of ints) --
    commitment_policy_ids: TreeMap[u256, str]
    commitment_observation_ids: TreeMap[u256, str]
    commitment_incident_ids: TreeMap[u256, str]

    # -- Holder policy tracker --
    holder_policy_ids: TreeMap[str, str]

    def __init__(self):
        self.next_commitment_id = u256(1)
        self.next_policy_id = u256(1)
        self.next_incident_id = u256(1)
        self.next_observation_id = u256(1)
        self.admin = gl.message.sender_address
        self.paused = False
        self.protocol_fee_bps = u256(200)
        self.observer_reward_bps = u256(100)
        self.protocol_treasury = u256(0)

    # ==============================================
    #  HELPERS
    # ==============================================

    def _require_not_paused(self) -> None:
        if self.paused:
            raise gl.vm.UserError("PAUSED")

    def _require_admin(self) -> None:
        if gl.message.sender_address != self.admin:
            raise gl.vm.UserError("NOT_ADMIN")

    def _require_operator(self, cid: u256) -> None:
        op = self.commitment_operator.get(cid)
        if op is None:
            raise gl.vm.UserError("COMMITMENT_NOT_FOUND")
        if gl.message.sender_address != op:
            raise gl.vm.UserError("NOT_OPERATOR")

    def _get_commitment_status(self, cid: u256) -> u256:
        s = self.commitment_status.get(cid)
        if s is None:
            raise gl.vm.UserError("COMMITMENT_NOT_FOUND")
        return s

    def _uw_key(self, cid: u256, addr: Address) -> str:
        return str(int(cid)) + ":" + addr.as_hex

    def _holder_key(self, addr: Address) -> str:
        return addr.as_hex

    def _append_to_json_array(self, map: TreeMap, key, val: int) -> None:
        existing = map.get(key)
        if existing is None or existing == "":
            map[key] = json.dumps([val])
        else:
            arr = json.loads(existing)
            arr.append(val)
            map[key] = json.dumps(arr)

    def _get_json_array(self, map: TreeMap, key) -> list:
        existing = map.get(key)
        if existing is None or existing == "":
            return []
        return json.loads(existing)

    def _free_capital(self, cid: u256) -> int:
        gross = int(self.vault_gross_capital.get(cid) or u256(0))
        reserved = int(self.vault_reserved_capital.get(cid) or u256(0))
        pending = int(self.vault_pending_claims.get(cid) or u256(0))
        losses = int(self.vault_realised_losses.get(cid) or u256(0))
        free = gross - reserved - pending - losses
        return max(0, free)

    def _available_coverage_capacity(self, cid: u256) -> int:
        free = self._free_capital(cid)
        bond = int(self.commitment_bond.get(cid) or u256(0))
        slashed = int(self.commitment_bond_slashed.get(cid) or u256(0))
        remaining_bond = bond - slashed
        bond_contribution = remaining_bond // 4
        return free + bond_contribution

    def _get_slash_bps_for_severity(self, cid: u256, severity: u256) -> int:
        ladder_json = self.commitment_slash_ladder.get(cid)
        if ladder_json is None:
            return 0
        ladder = json.loads(ladder_json)
        sev_str = str(int(severity))
        return int(ladder.get(sev_str, 0))

    def _get_payout_tier_bps(self, cid: u256, tier: u256) -> int:
        tiers_json = self.commitment_payout_tiers.get(cid)
        if tiers_json is None:
            return 0
        tiers = json.loads(tiers_json)
        tier_str = str(int(tier))
        return int(tiers.get(tier_str, 0))

    def _now(self) -> int:
        return int(time.time())

    def _severity_name(self, severity: u256) -> str:
        sev_names = ["NONE", "WARNING", "MINOR", "MATERIAL", "CRITICAL"]
        sev_int = int(severity)
        if sev_int < 0 or sev_int >= len(sev_names):
            return "MATERIAL"
        return sev_names[sev_int]

    def _severity_value(self, severity: str) -> u256:
        sev_map = {"NONE": SEV_NONE, "WARNING": SEV_WARNING, "MINOR": SEV_MINOR, "MATERIAL": SEV_MATERIAL, "CRITICAL": SEV_CRITICAL}
        return sev_map.get(severity, SEV_NONE)

    def _event_status_value(self, event_status: str) -> u256:
        event_map = {"NOT_CONFIRMED": EVT_NOT_CONFIRMED, "CONFIRMED": EVT_CONFIRMED, "INSUFFICIENT_EVIDENCE": EVT_INSUFFICIENT_EVIDENCE, "SOURCE_FAILURE": EVT_SOURCE_FAILURE, "CONFLICTING_EVIDENCE": EVT_CONFLICTING_EVIDENCE}
        return event_map.get(event_status, EVT_INSUFFICIENT_EVIDENCE)

    def _responsibility_value(self, responsibility: str) -> u256:
        resp_map = {"OPERATOR": RESP_OPERATOR, "EXTERNAL": RESP_EXTERNAL, "CLAIMANT": RESP_CLAIMANT, "SHARED": RESP_SHARED, "UNKNOWN": RESP_UNKNOWN}
        return resp_map.get(responsibility, RESP_UNKNOWN)

    def _derive_endpoint_decision(self, primary_status: str, backup_status: str, consecutive_failures: int, threshold: int) -> str:
        failure_count = consecutive_failures + 1
        backup_configured = backup_status != "NOT_CONFIGURED"
        if primary_status == "UP":
            return json.dumps({"is_healthy": True, "event_status": "NOT_CONFIRMED", "severity": "NONE", "responsibility": "UNKNOWN", "coverage_trigger": 0, "evidence_quality": "AUTHENTICATED_PRIMARY_HEALTHY"})
        if backup_configured and backup_status == "UP":
            return json.dumps({"is_healthy": False, "event_status": "CONFLICTING_EVIDENCE", "severity": "WARNING", "responsibility": "SHARED", "coverage_trigger": 0, "evidence_quality": "AUTHENTICATED_PRIMARY_FAILING_BACKUP_HEALTHY"})
        if failure_count < threshold:
            return json.dumps({"is_healthy": False, "event_status": "SOURCE_FAILURE", "severity": "WARNING", "responsibility": "UNKNOWN", "coverage_trigger": 0, "evidence_quality": "AUTHENTICATED_FAILURE_BELOW_THRESHOLD"})
        severity = "CRITICAL" if failure_count >= threshold * 2 else "MATERIAL"
        evidence_quality = "AUTHENTICATED_PRIMARY_AND_BACKUP_FAILURE" if backup_configured else "AUTHENTICATED_PRIMARY_FAILURE"
        return json.dumps({"is_healthy": False, "event_status": "CONFIRMED", "severity": severity, "responsibility": "OPERATOR", "coverage_trigger": 1, "evidence_quality": evidence_quality})

    def _derive_readjudication_decision(self, primary_status: str, backup_status: str, counter_available: bool, original_severity: int) -> str:
        service_recovered = primary_status == "UP"
        backup_healthy = backup_status == "UP"
        original_name = self._severity_name(u256(original_severity))
        if service_recovered and counter_available:
            return json.dumps({"ruling": "OVERTURN", "event_status": "NOT_CONFIRMED", "severity": "NONE", "coverage_trigger": 0, "responsibility": "UNKNOWN", "evidence_quality": "AUTHENTICATED_RECOVERY_WITH_COUNTER_EVIDENCE"})
        if service_recovered or backup_healthy:
            return json.dumps({"ruling": "REDUCE_SEVERITY", "event_status": "CONFLICTING_EVIDENCE", "severity": "WARNING", "coverage_trigger": 0, "responsibility": "SHARED", "evidence_quality": "AUTHENTICATED_RECOVERY_OR_BACKUP_HEALTHY"})
        if counter_available and original_severity > int(SEV_MINOR):
            return json.dumps({"ruling": "REDUCE_SEVERITY", "event_status": "CONFIRMED", "severity": "MINOR", "coverage_trigger": 1, "responsibility": "SHARED", "evidence_quality": "AUTHENTICATED_FAILURE_WITH_COUNTER_EVIDENCE"})
        return json.dumps({"ruling": "UPHOLD", "event_status": "CONFIRMED", "severity": original_name, "coverage_trigger": 1, "responsibility": "OPERATOR", "evidence_quality": "AUTHENTICATED_FAILURE_REPLAYED"})

    # -- Counter-evidence origin binding --

    def _url_origin(self, url: str) -> str:
        """Lowercased scheme://host for an http(s) URL, or "" when malformed.

        Credentials and port are stripped so that a declared host still matches when the
        operator cites the same host over an alternate port or with userinfo present.
        """
        u = url.strip().lower()
        if not u.startswith("http://") and not u.startswith("https://"):
            return ""
        scheme_end = u.find("://") + 3
        rest = u[scheme_end:]
        cut = len(rest)
        for ch in ("/", "?", "#"):
            i = rest.find(ch)
            if i != -1 and i < cut:
                cut = i
        host = rest[:cut]
        if "@" in host:
            host = host.split("@")[-1]
        if ":" in host:
            host = host.split(":")[0]
        if host == "":
            return ""
        return u[:scheme_end] + host

    def _declared_hosts(self, cid: u256) -> list:
        """Hosts the commitment itself declared (immutable after creation)."""
        hosts = []
        for raw in (
            self.commitment_target_url.get(cid) or "",
            self.commitment_backup_url.get(cid) or "",
        ):
            origin = self._url_origin(raw)
            if origin != "":
                host = origin.split("://")[-1]
                if host not in hosts:
                    hosts.append(host)
        return hosts

    def _validate_counter_evidence(self, cid: u256, urls: str) -> str:
        """Reject counter-evidence that is malformed or not served by a declared host."""
        raw = urls.strip()
        if raw == "":
            raise gl.vm.UserError("EMPTY_COUNTER_EVIDENCE")
        allowed = self._declared_hosts(cid)
        if len(allowed) == 0:
            raise gl.vm.UserError("NO_DECLARED_ORIGIN")
        parts = []
        for piece in raw.split("|"):
            item = piece.strip()
            if item == "":
                continue
            origin = self._url_origin(item)
            if origin == "":
                raise gl.vm.UserError("INVALID_EVIDENCE_URL")
            if origin.split("://")[-1] not in allowed:
                raise gl.vm.UserError("EVIDENCE_ORIGIN_NOT_BOUND")
            if item not in parts:
                parts.append(item)
        if len(parts) == 0:
            raise gl.vm.UserError("EMPTY_COUNTER_EVIDENCE")
        if len(parts) > MAX_COUNTER_EVIDENCE_URLS:
            raise gl.vm.UserError("TOO_MANY_EVIDENCE_URLS")
        return "|".join(parts)

    def _bind_counter_evidence(self, incident_id: u256, cid: u256) -> None:
        self.incident_counter_evidence_commitment[incident_id] = cid
        self.incident_counter_evidence_version[incident_id] = (
            self.commitment_version.get(cid) or u256(1)
        )

    def _require_counter_evidence_binding(self, incident_id: u256, cid: u256) -> None:
        """Counter-evidence must still belong to this commitment at its current version."""
        bound_cid = self.incident_counter_evidence_commitment.get(incident_id)
        if bound_cid is None:
            return
        if int(bound_cid) != int(cid):
            raise gl.vm.UserError("EVIDENCE_COMMITMENT_MISMATCH")
        bound_version = int(self.incident_counter_evidence_version.get(incident_id) or u256(0))
        current_version = int(self.commitment_version.get(cid) or u256(1))
        if bound_version != current_version:
            raise gl.vm.UserError("EVIDENCE_VERSION_STALE")

    # -- Outstanding policy accounting --

    def _expire_policy(self, pid: u256, cid: u256, was_active: bool) -> None:
        """Mark a past-term policy expired and release the capital it reserved."""
        self.policy_status[pid] = POL_EXPIRED
        limit = int(self.policy_limit.get(pid) or u256(0))
        reserved = int(self.vault_reserved_capital.get(cid) or u256(0))
        self.vault_reserved_capital[cid] = u256(max(0, reserved - limit))
        if was_active:
            apc = int(self.commitment_active_policy_count.get(cid) or u256(0))
            if apc > 0:
                self.commitment_active_policy_count[cid] = u256(apc - 1)

    def _outstanding_policy_count(self, cid: u256, now: int) -> int:
        """Policies the operator still owes coverage on.

        Counts ACTIVE *and* PENDING_WAIT policies still inside their term. Paid policies
        serving a waiting period are deliberately included: the premium is already collected,
        so the bond must remain locked even though the policy is not yet claimable. Policies
        past their term are expired in place and their reservation released.
        """
        outstanding = 0
        for pid_int in self._get_json_array(self.commitment_policy_ids, cid):
            pid = u256(pid_int)
            status = int(self.policy_status.get(pid) or u256(0))
            if status != int(POL_ACTIVE) and status != int(POL_PENDING_WAIT):
                continue
            if now > int(self.policy_end.get(pid) or u256(0)):
                self._expire_policy(pid, cid, status == int(POL_ACTIVE))
                continue
            outstanding += 1
        return outstanding

    def _policy_waiting_complete(self, policy_id: u256, cid: u256, at_time: int) -> bool:
        pol_start = int(self.policy_start.get(policy_id) or u256(0))
        waiting = int(self.commitment_waiting_period.get(cid) or u256(0))
        return at_time >= pol_start + waiting

    def _activate_waiting_policy_if_ready(self, policy_id: u256, now: int) -> bool:
        status = int(self.policy_status.get(policy_id) or u256(0))
        if status != int(POL_PENDING_WAIT):
            return False
        cid = self.policy_commitment.get(policy_id)
        if cid is None:
            return False
        pol_end = int(self.policy_end.get(policy_id) or u256(0))
        if now > pol_end:
            self.policy_status[policy_id] = POL_EXPIRED
            return False
        if not self._policy_waiting_complete(policy_id, cid, now):
            return False
        self.policy_status[policy_id] = POL_ACTIVE
        apc = int(self.commitment_active_policy_count.get(cid) or u256(0))
        self.commitment_active_policy_count[cid] = u256(apc + 1)
        return True

    # ==============================================
    #  OPERATOR: COMMITMENT LIFECYCLE
    # ==============================================

    @gl.public.write
    def create_commitment(
        self,
        service_name: str,
        description: str,
        template: u256,
        target_url: str,
        backup_url: str,
        observation_interval: u256,
        grace_period: u256,
        failure_threshold: u256,
        min_bond: u256,
        slash_ladder: str,
        payout_tiers: str,
        max_policy_limit: u256,
        min_policy_limit: u256,
        max_policy_duration: u256,
        min_policy_duration: u256,
        base_premium_bps: u256,
        deductible_bps: u256,
        waiting_period: u256,
        challenge_window: u256,
        max_cumulative_slash_bps: u256,
    ) -> u256:
        self._require_not_paused()
        sender = gl.message.sender_address

        if int(template) > 1:
            raise gl.vm.UserError("INVALID_TEMPLATE")
        if target_url == "":
            raise gl.vm.UserError("EMPTY_TARGET")
        if int(observation_interval) == 0:
            raise gl.vm.UserError("ZERO_INTERVAL")
        if int(min_bond) == 0:
            raise gl.vm.UserError("ZERO_MIN_BOND")
        if int(base_premium_bps) == 0 or int(base_premium_bps) > BPS_MAX:
            raise gl.vm.UserError("INVALID_PREMIUM_BPS")
        if int(max_cumulative_slash_bps) > BPS_MAX:
            raise gl.vm.UserError("INVALID_SLASH_CAP")

        json.loads(slash_ladder)
        json.loads(payout_tiers)

        cid = self.next_commitment_id
        self.next_commitment_id = u256(int(cid) + 1)

        self.commitment_operator[cid] = sender
        self.commitment_status[cid] = C_DRAFT
        self.commitment_bond[cid] = u256(0)
        self.commitment_bond_slashed[cid] = u256(0)
        self.commitment_min_bond[cid] = min_bond
        self.commitment_target_url[cid] = target_url
        self.commitment_backup_url[cid] = backup_url
        self.commitment_template[cid] = template
        self.commitment_service_name[cid] = service_name
        self.commitment_description[cid] = description
        self.commitment_observation_interval[cid] = observation_interval
        self.commitment_grace_period[cid] = grace_period
        self.commitment_failure_threshold[cid] = failure_threshold
        self.commitment_last_observation_time[cid] = u256(0)
        self.commitment_consecutive_failures[cid] = u256(0)
        self.commitment_incident_count[cid] = u256(0)
        self.commitment_active_incident[cid] = u256(0)
        self.commitment_version[cid] = u256(1)
        self.commitment_created_at[cid] = u256(self._now())
        self.commitment_activated_at[cid] = u256(0)
        self.commitment_policy_count[cid] = u256(0)
        self.commitment_active_policy_count[cid] = u256(0)

        self.commitment_slash_ladder[cid] = slash_ladder
        self.commitment_payout_tiers[cid] = payout_tiers
        self.commitment_max_policy_limit[cid] = max_policy_limit
        self.commitment_min_policy_limit[cid] = min_policy_limit
        self.commitment_max_policy_duration[cid] = max_policy_duration
        self.commitment_min_policy_duration[cid] = min_policy_duration
        self.commitment_base_premium_bps[cid] = base_premium_bps
        self.commitment_deductible_bps[cid] = deductible_bps
        self.commitment_waiting_period[cid] = waiting_period
        self.commitment_challenge_window[cid] = challenge_window
        self.commitment_max_cumulative_slash_bps[cid] = max_cumulative_slash_bps

        self.vault_gross_capital[cid] = u256(0)
        self.vault_reserved_capital[cid] = u256(0)
        self.vault_earned_premium[cid] = u256(0)
        self.vault_pending_claims[cid] = u256(0)
        self.vault_realised_losses[cid] = u256(0)
        self.vault_total_shares[cid] = u256(0)

        return cid

    @gl.public.write.payable
    def deposit_operator_bond(self, commitment_id: u256) -> None:
        self._require_not_paused()
        self._require_operator(commitment_id)
        value = gl.message.value
        if int(value) == 0:
            raise gl.vm.UserError("ZERO_VALUE")

        status = self._get_commitment_status(commitment_id)
        if int(status) != int(C_DRAFT) and int(status) != int(C_BONDING) and int(status) != int(C_ACTIVE) and int(status) != int(C_SUSPENDED):
            raise gl.vm.UserError("INVALID_STATUS_FOR_BOND")

        current_bond = int(self.commitment_bond.get(commitment_id) or u256(0))
        self.commitment_bond[commitment_id] = u256(current_bond + int(value))

        if int(status) == int(C_DRAFT):
            self.commitment_status[commitment_id] = C_BONDING

    @gl.public.write
    def activate_commitment(self, commitment_id: u256) -> None:
        self._require_not_paused()
        self._require_operator(commitment_id)

        status = self._get_commitment_status(commitment_id)
        if int(status) != int(C_BONDING) and int(status) != int(C_CAPITALISING):
            raise gl.vm.UserError("INVALID_STATUS_FOR_ACTIVATE")

        bond = int(self.commitment_bond.get(commitment_id) or u256(0))
        min_bond = int(self.commitment_min_bond.get(commitment_id) or u256(0))
        if bond < min_bond:
            raise gl.vm.UserError("INSUFFICIENT_BOND")

        self.commitment_status[commitment_id] = C_ACTIVE
        self.commitment_activated_at[commitment_id] = u256(self._now())

    @gl.public.write.payable
    def add_operator_bond(self, commitment_id: u256) -> None:
        self._require_not_paused()
        self._require_operator(commitment_id)
        value = gl.message.value
        if int(value) == 0:
            raise gl.vm.UserError("ZERO_VALUE")

        current_bond = int(self.commitment_bond.get(commitment_id) or u256(0))
        self.commitment_bond[commitment_id] = u256(current_bond + int(value))

        status = self._get_commitment_status(commitment_id)
        if int(status) == int(C_SUSPENDED):
            slashed = int(self.commitment_bond_slashed.get(commitment_id) or u256(0))
            new_bond = current_bond + int(value)
            remaining = new_bond - slashed
            min_bond = int(self.commitment_min_bond.get(commitment_id) or u256(0))
            if remaining >= min_bond:
                active_inc = int(self.commitment_active_incident.get(commitment_id) or u256(0))
                if active_inc == 0:
                    self.commitment_status[commitment_id] = C_ACTIVE

    @gl.public.write
    def begin_wind_down(self, commitment_id: u256) -> None:
        self._require_operator(commitment_id)
        status = self._get_commitment_status(commitment_id)
        if int(status) != int(C_ACTIVE) and int(status) != int(C_WATCH):
            raise gl.vm.UserError("CANNOT_WIND_DOWN")

        # Paid policies -- including those still serving a waiting period -- keep the
        # commitment open. Premiums are already collected, so coverage cannot be abandoned.
        if self._outstanding_policy_count(commitment_id, self._now()) > 0:
            raise gl.vm.UserError("OUTSTANDING_POLICIES")

        self.commitment_status[commitment_id] = C_WINDING_DOWN

    @gl.public.write
    def request_bond_withdrawal(self, commitment_id: u256) -> None:
        self._require_operator(commitment_id)
        status = self._get_commitment_status(commitment_id)
        if int(status) != int(C_WINDING_DOWN) and int(status) != int(C_CLOSED):
            raise gl.vm.UserError("NOT_WINDING_DOWN")

        # Counts PENDING_WAIT alongside ACTIVE: a policy whose premium is paid but whose
        # waiting period has not elapsed is not reflected in active_policy_count, and must
        # still block the operator from reclaiming the bond backing it.
        if self._outstanding_policy_count(commitment_id, self._now()) > 0:
            raise gl.vm.UserError("OUTSTANDING_POLICIES")

        active_inc = int(self.commitment_active_incident.get(commitment_id) or u256(0))
        if active_inc > 0:
            raise gl.vm.UserError("ACTIVE_INCIDENT")

        bond = int(self.commitment_bond.get(commitment_id) or u256(0))
        slashed = int(self.commitment_bond_slashed.get(commitment_id) or u256(0))
        withdrawable = bond - slashed
        if withdrawable <= 0:
            raise gl.vm.UserError("NOTHING_TO_WITHDRAW")

        self.commitment_bond[commitment_id] = u256(slashed)
        self.commitment_status[commitment_id] = C_CLOSED
        operator = self.commitment_operator[commitment_id]
        gl.get_contract_at(operator).emit_transfer(value=u256(withdrawable))

    @gl.public.write
    def execute_bond_withdrawal(self, commitment_id: u256) -> None:
        self.request_bond_withdrawal(commitment_id)

    # ==============================================
    #  UNDERWRITER: CAPITAL
    # ==============================================

    @gl.public.write.payable
    def deposit_coverage_capital(self, commitment_id: u256) -> None:
        self._require_not_paused()
        value = gl.message.value
        if int(value) == 0:
            raise gl.vm.UserError("ZERO_VALUE")

        status = self._get_commitment_status(commitment_id)
        allowed = [int(C_BONDING), int(C_CAPITALISING), int(C_ACTIVE)]
        if int(status) not in allowed:
            raise gl.vm.UserError("INVALID_STATUS_FOR_DEPOSIT")

        sender = gl.message.sender_address
        key = self._uw_key(commitment_id, sender)

        gross = int(self.vault_gross_capital.get(commitment_id) or u256(0))
        self.vault_gross_capital[commitment_id] = u256(gross + int(value))

        total_shares = int(self.vault_total_shares.get(commitment_id) or u256(0))
        if total_shares == 0 or gross == 0:
            new_shares = int(value)
        else:
            new_shares = (int(value) * total_shares) // gross

        self.vault_total_shares[commitment_id] = u256(total_shares + new_shares)

        existing_shares = int(self.underwriter_shares.get(key) or u256(0))
        self.underwriter_shares[key] = u256(existing_shares + new_shares)

        existing_deposited = int(self.underwriter_deposited.get(key) or u256(0))
        self.underwriter_deposited[key] = u256(existing_deposited + int(value))

        if int(status) == int(C_BONDING):
            self.commitment_status[commitment_id] = C_CAPITALISING

    @gl.public.write
    def request_underwriter_withdrawal(self, commitment_id: u256, shares: u256) -> None:
        sender = gl.message.sender_address
        key = self._uw_key(commitment_id, sender)

        existing_shares = int(self.underwriter_shares.get(key) or u256(0))
        if int(shares) == 0 or int(shares) > existing_shares:
            raise gl.vm.UserError("INVALID_SHARES")

        wd_status = int(self.underwriter_withdrawal_status.get(key) or u256(0))
        if wd_status == int(WD_QUEUED) or wd_status == int(WD_LOCKED_BY_INCIDENT):
            raise gl.vm.UserError("WITHDRAWAL_PENDING")

        active_inc = int(self.commitment_active_incident.get(commitment_id) or u256(0))
        if active_inc > 0:
            self.underwriter_withdrawal_status[key] = WD_LOCKED_BY_INCIDENT
            self.underwriter_withdrawal_shares[key] = shares
            self.underwriter_withdrawal_time[key] = u256(self._now())
            return

        self.underwriter_withdrawal_status[key] = WD_QUEUED
        self.underwriter_withdrawal_shares[key] = shares
        self.underwriter_withdrawal_time[key] = u256(self._now())

    @gl.public.write
    def cancel_underwriter_withdrawal(self, commitment_id: u256) -> None:
        sender = gl.message.sender_address
        key = self._uw_key(commitment_id, sender)

        wd_status = int(self.underwriter_withdrawal_status.get(key) or u256(0))
        if wd_status != int(WD_QUEUED) and wd_status != int(WD_LOCKED_BY_INCIDENT):
            raise gl.vm.UserError("NO_PENDING_WITHDRAWAL")

        self.underwriter_withdrawal_status[key] = WD_CANCELLED
        self.underwriter_withdrawal_shares[key] = u256(0)

    @gl.public.write
    def execute_underwriter_withdrawal(self, commitment_id: u256) -> None:
        sender = gl.message.sender_address
        key = self._uw_key(commitment_id, sender)

        wd_status = int(self.underwriter_withdrawal_status.get(key) or u256(0))
        if wd_status == int(WD_LOCKED_BY_INCIDENT):
            active_inc = int(self.commitment_active_incident.get(commitment_id) or u256(0))
            if active_inc > 0:
                raise gl.vm.UserError("INCIDENT_ACTIVE")
            self.underwriter_withdrawal_status[key] = WD_EXECUTABLE
            wd_status = int(WD_EXECUTABLE)

        if wd_status != int(WD_QUEUED) and wd_status != int(WD_EXECUTABLE):
            raise gl.vm.UserError("NOT_QUEUED")

        shares_to_withdraw = int(self.underwriter_withdrawal_shares.get(key) or u256(0))
        existing_shares = int(self.underwriter_shares.get(key) or u256(0))
        if shares_to_withdraw == 0:
            raise gl.vm.UserError("ZERO_SHARES")
        if shares_to_withdraw > existing_shares:
            shares_to_withdraw = existing_shares

        total_shares = int(self.vault_total_shares.get(commitment_id) or u256(0))
        if total_shares == 0:
            raise gl.vm.UserError("NO_SHARES")

        free = self._free_capital(commitment_id)
        gross = int(self.vault_gross_capital.get(commitment_id) or u256(0))
        if gross <= 0 or free <= 0:
            raise gl.vm.UserError("NO_FREE_CAPITAL")

        share_value = (shares_to_withdraw * gross) // total_shares
        executable_shares = shares_to_withdraw
        payout = share_value
        if share_value > free:
            executable_shares = (free * total_shares) // gross
            if executable_shares <= 0:
                raise gl.vm.UserError("NO_FREE_CAPITAL")
            if executable_shares > shares_to_withdraw:
                executable_shares = shares_to_withdraw
            payout = (executable_shares * gross) // total_shares
            if payout > free:
                payout = free

        remaining_request = shares_to_withdraw - executable_shares

        self.vault_gross_capital[commitment_id] = u256(gross - payout)
        self.vault_total_shares[commitment_id] = u256(total_shares - executable_shares)
        self.underwriter_shares[key] = u256(existing_shares - executable_shares)

        if remaining_request > 0:
            self.underwriter_withdrawal_status[key] = WD_QUEUED
            self.underwriter_withdrawal_shares[key] = u256(remaining_request)
        else:
            self.underwriter_withdrawal_status[key] = WD_EXECUTED
            self.underwriter_withdrawal_shares[key] = u256(0)

        gl.get_contract_at(sender).emit_transfer(value=u256(payout))

    # ==============================================
    #  POLICYHOLDER: COVERAGE
    # ==============================================

    @gl.public.write.payable
    def purchase_coverage(self, commitment_id: u256, limit: u256, duration: u256) -> u256:
        self._require_not_paused()

        status = self._get_commitment_status(commitment_id)
        if int(status) != int(C_ACTIVE):
            raise gl.vm.UserError("NOT_ACTIVE")

        active_inc = int(self.commitment_active_incident.get(commitment_id) or u256(0))
        if active_inc > 0:
            raise gl.vm.UserError("INCIDENT_ACTIVE")

        min_limit = int(self.commitment_min_policy_limit.get(commitment_id) or u256(0))
        max_limit = int(self.commitment_max_policy_limit.get(commitment_id) or u256(0))
        if int(limit) < min_limit or int(limit) > max_limit:
            raise gl.vm.UserError("INVALID_LIMIT")

        min_dur = int(self.commitment_min_policy_duration.get(commitment_id) or u256(0))
        max_dur = int(self.commitment_max_policy_duration.get(commitment_id) or u256(0))
        if int(duration) < min_dur or int(duration) > max_dur:
            raise gl.vm.UserError("INVALID_DURATION")

        capacity = self._available_coverage_capacity(commitment_id)
        if int(limit) > capacity:
            raise gl.vm.UserError("INSUFFICIENT_CAPACITY")

        base_bps = int(self.commitment_base_premium_bps.get(commitment_id) or u256(0))
        gross_cap = int(self.vault_gross_capital.get(commitment_id) or u256(0))
        reserved = int(self.vault_reserved_capital.get(commitment_id) or u256(0))

        utilisation_bps = 0
        if gross_cap > 0:
            utilisation_bps = (reserved * BPS_MAX) // gross_cap

        adjusted_bps = base_bps + (base_bps * utilisation_bps) // BPS_MAX
        premium = (int(limit) * adjusted_bps * int(duration)) // (BPS_MAX * 365 * 86400)
        if premium == 0:
            premium = 1

        value = int(gl.message.value)
        if value < premium:
            raise gl.vm.UserError("INSUFFICIENT_PREMIUM")

        now = self._now()
        pid = self.next_policy_id
        self.next_policy_id = u256(int(pid) + 1)

        waiting = int(self.commitment_waiting_period.get(commitment_id) or u256(0))

        self.policy_commitment[pid] = commitment_id
        self.policy_holder[pid] = gl.message.sender_address
        self.policy_limit[pid] = limit
        self.policy_premium_paid[pid] = u256(premium)
        self.policy_start[pid] = u256(now)
        self.policy_end[pid] = u256(now + int(duration))
        deductible_bps = int(self.commitment_deductible_bps.get(commitment_id) or u256(0))
        self.policy_deductible[pid] = u256((int(limit) * deductible_bps) // BPS_MAX)
        self.policy_version[pid] = self.commitment_version.get(commitment_id) or u256(1)
        self.policy_claimable[pid] = u256(0)
        self.policy_claimed[pid] = u256(0)
        self.policy_payout_tier[pid] = u256(0)
        self.policy_incident_id[pid] = u256(0)

        if waiting > 0:
            self.policy_status[pid] = POL_PENDING_WAIT
        else:
            self.policy_status[pid] = POL_ACTIVE

        reserved_new = reserved + int(limit)
        self.vault_reserved_capital[commitment_id] = u256(reserved_new)

        protocol_fee = (premium * int(self.protocol_fee_bps)) // BPS_MAX
        observer_fee = (premium * int(self.observer_reward_bps)) // BPS_MAX
        underwriter_share = premium - protocol_fee - observer_fee

        self.protocol_treasury = u256(int(self.protocol_treasury) + protocol_fee)

        earned = int(self.vault_earned_premium.get(commitment_id) or u256(0))
        self.vault_earned_premium[commitment_id] = u256(earned + underwriter_share + observer_fee)

        pc = int(self.commitment_policy_count.get(commitment_id) or u256(0))
        self.commitment_policy_count[commitment_id] = u256(pc + 1)
        if waiting == 0:
            apc = int(self.commitment_active_policy_count.get(commitment_id) or u256(0))
            self.commitment_active_policy_count[commitment_id] = u256(apc + 1)

        self._append_to_json_array(self.commitment_policy_ids, commitment_id, int(pid))

        holder_key = self._holder_key(gl.message.sender_address)
        self._append_to_json_array(self.holder_policy_ids, holder_key, int(pid))

        if value > premium:
            refund = value - premium
            gl.get_contract_at(gl.message.sender_address).emit_transfer(value=u256(refund))

        return pid

    @gl.public.write
    def activate_waiting_policy(self, policy_id: u256) -> None:
        holder = self.policy_holder.get(policy_id)
        if holder is None:
            raise gl.vm.UserError("POLICY_NOT_FOUND")
        if gl.message.sender_address != holder:
            raise gl.vm.UserError("NOT_HOLDER")
        if not self._activate_waiting_policy_if_ready(policy_id, self._now()):
            raise gl.vm.UserError("WAITING_PERIOD_ACTIVE")

    @gl.public.write
    def sweep_expired_policies(self, commitment_id: u256) -> u256:
        """Expire past-term policies, release their reservations, return what remains owed.

        Permissionless: anyone may clear stale reservations so an operator is never blocked
        from winding down by policies that have genuinely lapsed.
        """
        return u256(self._outstanding_policy_count(commitment_id, self._now()))

    @gl.public.write
    def claim_payout(self, policy_id: u256) -> None:
        holder = self.policy_holder.get(policy_id)
        if holder is None:
            raise gl.vm.UserError("POLICY_NOT_FOUND")
        if gl.message.sender_address != holder:
            raise gl.vm.UserError("NOT_HOLDER")

        pol_status = int(self.policy_status.get(policy_id) or u256(0))
        if pol_status != int(POL_PAYOUT_READY):
            raise gl.vm.UserError("NOT_PAYOUT_READY")

        claimable = int(self.policy_claimable.get(policy_id) or u256(0))
        already_claimed = int(self.policy_claimed.get(policy_id) or u256(0))
        payout = claimable - already_claimed
        if payout <= 0:
            raise gl.vm.UserError("NOTHING_TO_CLAIM")

        self.policy_claimed[policy_id] = u256(claimable)
        self.policy_status[policy_id] = POL_PAID

        cid = self.policy_commitment[policy_id]
        pending = int(self.vault_pending_claims.get(cid) or u256(0))
        self.vault_pending_claims[cid] = u256(max(0, pending - payout))

        losses = int(self.vault_realised_losses.get(cid) or u256(0))
        self.vault_realised_losses[cid] = u256(losses + payout)

        apc = int(self.commitment_active_policy_count.get(cid) or u256(0))
        if apc > 0:
            self.commitment_active_policy_count[cid] = u256(apc - 1)

        reserved = int(self.vault_reserved_capital.get(cid) or u256(0))
        limit = int(self.policy_limit.get(policy_id) or u256(0))
        self.vault_reserved_capital[cid] = u256(max(0, reserved - limit))

        gl.get_contract_at(holder).emit_transfer(value=u256(payout))

    # ==============================================
    #  OBSERVER: OBSERVATION + ADJUDICATION
    # ==============================================

    @gl.public.write
    def request_observation(self, commitment_id: u256) -> None:
        self._require_not_paused()

        status = self._get_commitment_status(commitment_id)
        if int(status) != int(C_ACTIVE) and int(status) != int(C_WATCH) and int(status) != int(C_INCIDENT_OPEN):
            raise gl.vm.UserError("NOT_OBSERVABLE")

        now = self._now()
        last_obs = int(self.commitment_last_observation_time.get(commitment_id) or u256(0))
        interval = int(self.commitment_observation_interval.get(commitment_id) or u256(0))

        if last_obs > 0 and (now - last_obs) < interval:
            raise gl.vm.UserError("NOT_DUE")

        target_url = self.commitment_target_url.get(commitment_id) or ""
        backup_url = self.commitment_backup_url.get(commitment_id) or ""
        template = int(self.commitment_template.get(commitment_id) or u256(0))
        grace = int(self.commitment_grace_period.get(commitment_id) or u256(0))
        threshold = int(self.commitment_failure_threshold.get(commitment_id) or u256(0))
        service_name = self.commitment_service_name.get(commitment_id) or ""
        description = self.commitment_description.get(commitment_id) or ""
        slash_ladder = self.commitment_slash_ladder.get(commitment_id) or "{}"
        payout_tiers = self.commitment_payout_tiers.get(commitment_id) or "{}"
        consec_failures = int(self.commitment_consecutive_failures.get(commitment_id) or u256(0))

        cid_int = int(commitment_id)
        target = target_url
        backup = backup_url

        def leader_fn():
            primary_status = "UNKNOWN"
            primary_code = 0
            primary_body = ""
            backup_status = "NOT_CONFIGURED"
            backup_code = 0
            backup_body = ""
            try:
                resp = gl.nondet.web.get(target)
                primary_code = int(resp.status)
                primary_status = "UP" if resp.status >= 200 and resp.status < 400 else "DOWN"
                if resp.body:
                    primary_body = resp.body.decode("utf-8", errors="replace")[:500]
            except Exception:
                primary_status = "UNREACHABLE"
            if backup and backup != "":
                try:
                    resp2 = gl.nondet.web.get(backup)
                    backup_code = int(resp2.status)
                    backup_status = "UP" if resp2.status >= 200 and resp2.status < 400 else "DOWN"
                    if resp2.body:
                        backup_body = resp2.body.decode("utf-8", errors="replace")[:500]
                except Exception:
                    backup_status = "UNREACHABLE"
            decision = json.loads(self._derive_endpoint_decision(primary_status, backup_status, consec_failures, threshold))
            result = {
                "primary_status": primary_status,
                "primary_status_code": primary_code,
                "backup_status": backup_status,
                "backup_status_code": backup_code,
                "target_url": target,
                "backup_url": backup,
                "primary_body_sample": primary_body,
                "backup_body_sample": backup_body,
                "is_healthy": decision["is_healthy"],
                "event_status": decision["event_status"],
                "severity": decision["severity"],
                "responsibility": decision["responsibility"],
                "coverage_trigger": decision["coverage_trigger"],
                "evidence_quality": decision["evidence_quality"],
                "authenticated_source": "COMMITTED_ENDPOINTS",
                "consecutive_failures": consec_failures + (0 if decision["is_healthy"] else 1),
                "summary": f"Authenticated endpoint evidence: primary={primary_status}({primary_code}), backup={backup_status}({backup_code}), event={decision['event_status']}, severity={decision['severity']}",
            }
            return json.dumps(result)

        def validator_fn(leader_result):
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                leader_data = json.loads(leader_result.calldata)
            except Exception:
                return False
            required = ["primary_status", "backup_status", "event_status", "severity", "is_healthy", "responsibility", "coverage_trigger", "evidence_quality", "authenticated_source"]
            for field in required:
                if field not in leader_data:
                    return False
            if leader_data.get("authenticated_source") != "COMMITTED_ENDPOINTS":
                return False
            try:
                my_resp = gl.nondet.web.get(target)
                my_primary_status = "UP" if my_resp.status >= 200 and my_resp.status < 400 else "DOWN"
            except Exception:
                my_primary_status = "UNREACHABLE"
            my_backup_status = "NOT_CONFIGURED"
            if backup and backup != "":
                try:
                    my_resp2 = gl.nondet.web.get(backup)
                    my_backup_status = "UP" if my_resp2.status >= 200 and my_resp2.status < 400 else "DOWN"
                except Exception:
                    my_backup_status = "UNREACHABLE"
            if my_primary_status != leader_data["primary_status"]:
                return False
            if my_backup_status != leader_data["backup_status"]:
                return False
            expected = json.loads(self._derive_endpoint_decision(my_primary_status, my_backup_status, consec_failures, threshold))
            for field in ["is_healthy", "event_status", "severity", "responsibility", "coverage_trigger", "evidence_quality"]:
                if leader_data.get(field) != expected.get(field):
                    return False
            return True

        result_json = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        obs_id = self.next_observation_id
        self.next_observation_id = u256(int(obs_id) + 1)

        self.observation_commitment[obs_id] = commitment_id
        self.observation_window_start[obs_id] = u256(now)
        self.observation_window_end[obs_id] = u256(now)
        self.observation_result_hash[obs_id] = result_json[:200]
        self.observation_triggerer[obs_id] = gl.message.sender_address
        self.observation_created_at[obs_id] = u256(now)

        self.commitment_last_observation_time[commitment_id] = u256(now)
        self._append_to_json_array(self.commitment_observation_ids, commitment_id, int(obs_id))

        result = json.loads(result_json)
        is_healthy = result.get("is_healthy", True)
        event_status = result.get("event_status", "NOT_CONFIRMED")
        severity_str = result.get("severity", "NONE")

        if is_healthy:
            self.observation_status[obs_id] = OBS_NOMINAL
            self.commitment_consecutive_failures[commitment_id] = u256(0)

            active_inc = int(self.commitment_active_incident.get(commitment_id) or u256(0))
            if active_inc > 0:
                inc_status = int(self.incident_status.get(u256(active_inc)) or u256(0))
                if inc_status == int(INC_SUSPECTED) or inc_status == int(INC_EVIDENCE_GATHERING):
                    self.incident_status[u256(active_inc)] = INC_RECOVERED
                    self.incident_end_time[u256(active_inc)] = u256(now)
                    self.commitment_active_incident[commitment_id] = u256(0)
                    if int(status) == int(C_INCIDENT_OPEN):
                        self.commitment_status[commitment_id] = C_ACTIVE
        else:
            self.observation_status[obs_id] = OBS_ANOMALY
            new_consec = consec_failures + 1
            self.commitment_consecutive_failures[commitment_id] = u256(new_consec)

            if event_status == "CONFIRMED":
                severity_u = self._severity_value(severity_str)

                active_inc = int(self.commitment_active_incident.get(commitment_id) or u256(0))
                if active_inc == 0:
                    inc_id = self.next_incident_id
                    self.next_incident_id = u256(int(inc_id) + 1)

                    self.incident_commitment[inc_id] = commitment_id
                    self.incident_status[inc_id] = INC_PROVISIONAL_VERDICT
                    self.incident_severity[inc_id] = severity_u
                    self.incident_event_status[inc_id] = self._event_status_value(event_status)
                    self.incident_responsibility[inc_id] = self._responsibility_value(result.get("responsibility", "UNKNOWN"))
                    slash_bps = self._get_slash_bps_for_severity(commitment_id, severity_u)
                    self.incident_slash_bps[inc_id] = u256(slash_bps)
                    self.incident_start_time[inc_id] = u256(now)
                    self.incident_end_time[inc_id] = u256(0)
                    self.incident_duration[inc_id] = u256(0)
                    self.incident_source_hash[inc_id] = result_json[:200]
                    self.incident_summary[inc_id] = result.get("summary", "")
                    self.incident_evidence_quality[inc_id] = result.get("evidence_quality", "")
                    self.incident_payout_tier[inc_id] = severity_u
                    self.incident_coverage_trigger[inc_id] = u256(int(result.get("coverage_trigger", 0)))
                    self.incident_observation_id[inc_id] = obs_id

                    self.commitment_active_incident[commitment_id] = inc_id
                    ic = int(self.commitment_incident_count.get(commitment_id) or u256(0))
                    self.commitment_incident_count[commitment_id] = u256(ic + 1)
                    self._append_to_json_array(self.commitment_incident_ids, commitment_id, int(inc_id))

                    self.commitment_status[commitment_id] = C_INCIDENT_OPEN

                    challenge_window = int(self.commitment_challenge_window.get(commitment_id) or u256(0))
                    if challenge_window > 0:
                        self.incident_status[inc_id] = INC_CHALLENGE_WINDOW
                else:
                    existing_sev = int(self.incident_severity.get(u256(active_inc)) or u256(0))
                    if int(severity_u) > existing_sev:
                        self.incident_severity[u256(active_inc)] = severity_u
                        new_slash_bps = self._get_slash_bps_for_severity(commitment_id, severity_u)
                        self.incident_slash_bps[u256(active_inc)] = u256(new_slash_bps)
                        self.incident_payout_tier[u256(active_inc)] = severity_u

    @gl.public.write
    def open_suspected_incident(self, commitment_id: u256) -> None:
        self._require_not_paused()
        status = self._get_commitment_status(commitment_id)
        if int(status) != int(C_ACTIVE) and int(status) != int(C_WATCH):
            raise gl.vm.UserError("NOT_OBSERVABLE")

        active_inc = int(self.commitment_active_incident.get(commitment_id) or u256(0))
        if active_inc > 0:
            raise gl.vm.UserError("INCIDENT_ALREADY_OPEN")

        now = self._now()
        inc_id = self.next_incident_id
        self.next_incident_id = u256(int(inc_id) + 1)

        self.incident_commitment[inc_id] = commitment_id
        self.incident_status[inc_id] = INC_SUSPECTED
        self.incident_severity[inc_id] = SEV_NONE
        self.incident_event_status[inc_id] = EVT_NOT_CONFIRMED
        self.incident_responsibility[inc_id] = RESP_UNKNOWN
        self.incident_start_time[inc_id] = u256(now)
        self.incident_end_time[inc_id] = u256(0)

        self.commitment_active_incident[commitment_id] = inc_id
        ic = int(self.commitment_incident_count.get(commitment_id) or u256(0))
        self.commitment_incident_count[commitment_id] = u256(ic + 1)
        self._append_to_json_array(self.commitment_incident_ids, commitment_id, int(inc_id))

        self.commitment_status[commitment_id] = C_INCIDENT_OPEN

    @gl.public.write
    def request_incident_update(self, incident_id: u256) -> None:
        cid = self.incident_commitment.get(incident_id)
        if cid is None:
            raise gl.vm.UserError("INCIDENT_NOT_FOUND")
        self.request_observation(cid)

    @gl.public.write
    def request_recovery_check(self, incident_id: u256) -> None:
        self.request_incident_update(incident_id)

    # ==============================================
    #  CHALLENGE + RESOLUTION
    # ==============================================

    @gl.public.write
    def challenge_incident(self, incident_id: u256, counter_evidence_urls: str) -> None:
        cid = self.incident_commitment.get(incident_id)
        if cid is None:
            raise gl.vm.UserError("INCIDENT_NOT_FOUND")
        self._require_operator(cid)

        inc_status = int(self.incident_status.get(incident_id) or u256(0))
        if inc_status != int(INC_CHALLENGE_WINDOW) and inc_status != int(INC_PROVISIONAL_VERDICT):
            raise gl.vm.UserError("NOT_CHALLENGEABLE")

        normalized = self._validate_counter_evidence(cid, counter_evidence_urls)

        self.incident_challenger[incident_id] = gl.message.sender_address
        self.incident_challenge_time[incident_id] = u256(self._now())
        self.incident_counter_evidence_urls[incident_id] = normalized
        self._bind_counter_evidence(incident_id, cid)
        self.incident_status[incident_id] = INC_READJUDICATION_PENDING

    @gl.public.write
    def submit_counter_evidence(self, incident_id: u256, urls: str) -> None:
        cid = self.incident_commitment.get(incident_id)
        if cid is None:
            raise gl.vm.UserError("INCIDENT_NOT_FOUND")
        self._require_operator(cid)

        self._require_counter_evidence_binding(incident_id, cid)

        existing = self.incident_counter_evidence_urls.get(incident_id) or ""
        combined = (existing + "|" + urls) if existing else urls
        self.incident_counter_evidence_urls[incident_id] = self._validate_counter_evidence(
            cid, combined
        )
        self._bind_counter_evidence(incident_id, cid)

    @gl.public.write
    def request_readjudication(self, incident_id: u256) -> None:
        self._require_not_paused()

        inc_status = int(self.incident_status.get(incident_id) or u256(0))
        if inc_status != int(INC_READJUDICATION_PENDING):
            raise gl.vm.UserError("NOT_READJUDICATION_PENDING")

        cid = self.incident_commitment[incident_id]
        self._require_counter_evidence_binding(incident_id, cid)
        target_url = self.commitment_target_url.get(cid) or ""
        backup_url = self.commitment_backup_url.get(cid) or ""
        counter_urls_raw = self.incident_counter_evidence_urls.get(incident_id) or ""
        original_summary = self.incident_summary.get(incident_id) or ""
        original_severity = int(self.incident_severity.get(incident_id) or u256(0))
        service_name = self.commitment_service_name.get(cid) or ""
        description = self.commitment_description.get(cid) or ""
        slash_ladder = self.commitment_slash_ladder.get(cid) or "{}"

        target = target_url
        backup = backup_url
        counter_urls = counter_urls_raw
        orig_summary = original_summary
        orig_sev = original_severity

        def leader_fn():
            primary_status = "UNKNOWN"
            primary_code = 0
            backup_status = "NOT_CONFIGURED"
            backup_code = 0
            try:
                resp = gl.nondet.web.get(target)
                primary_code = int(resp.status)
                primary_status = "UP" if resp.status >= 200 and resp.status < 400 else "DOWN"
            except Exception:
                primary_status = "UNREACHABLE"

            if backup and backup != "":
                try:
                    resp2 = gl.nondet.web.get(backup)
                    backup_code = int(resp2.status)
                    backup_status = "UP" if resp2.status >= 200 and resp2.status < 400 else "DOWN"
                except Exception:
                    backup_status = "UNREACHABLE"

            counter_results = []
            counter_supports_operator = False
            if counter_urls:
                for url in counter_urls.split("|")[:3]:
                    url = url.strip()
                    if url:
                        try:
                            cr = gl.nondet.web.get(url)
                            available = cr.status >= 200 and cr.status < 400
                            counter_results.append({"url": url, "status": int(cr.status), "available": available})
                            if available:
                                counter_supports_operator = True
                        except Exception:
                            counter_results.append({"url": url, "status": 0, "available": False})

            decision = json.loads(self._derive_readjudication_decision(primary_status, backup_status, counter_supports_operator, orig_sev))
            return json.dumps({
                "ruling": decision["ruling"],
                "event_status": decision["event_status"],
                "severity": decision["severity"],
                "coverage_trigger": decision["coverage_trigger"],
                "responsibility": decision["responsibility"],
                "evidence_quality": decision["evidence_quality"],
                "authenticated_source": "COMMITTED_ENDPOINTS_AND_COUNTER_EVIDENCE",
                "primary_status": primary_status,
                "primary_status_code": primary_code,
                "backup_status": backup_status,
                "backup_status_code": backup_code,
                "counter_results": counter_results,
                "counter_supports_operator": counter_supports_operator,
                "original_summary": orig_summary,
                "readjudication_summary": f"Authenticated readjudication: primary={primary_status}({primary_code}), backup={backup_status}({backup_code}), counter={counter_supports_operator}, ruling={decision['ruling']}"
            })

        def validator_fn(leader_result):
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                data = json.loads(leader_result.calldata)
            except Exception:
                return False
            required = ["ruling", "event_status", "severity", "coverage_trigger", "responsibility", "evidence_quality", "authenticated_source", "primary_status", "backup_status", "counter_supports_operator"]
            for field in required:
                if field not in data:
                    return False
            if data.get("authenticated_source") != "COMMITTED_ENDPOINTS_AND_COUNTER_EVIDENCE":
                return False

            try:
                my_resp = gl.nondet.web.get(target)
                my_primary_status = "UP" if my_resp.status >= 200 and my_resp.status < 400 else "DOWN"
            except Exception:
                my_primary_status = "UNREACHABLE"
            my_backup_status = "NOT_CONFIGURED"
            if backup and backup != "":
                try:
                    my_resp2 = gl.nondet.web.get(backup)
                    my_backup_status = "UP" if my_resp2.status >= 200 and my_resp2.status < 400 else "DOWN"
                except Exception:
                    my_backup_status = "UNREACHABLE"
            counter_available = False
            if counter_urls:
                for url in counter_urls.split("|")[:3]:
                    url = url.strip()
                    if url:
                        try:
                            cr = gl.nondet.web.get(url)
                            if cr.status >= 200 and cr.status < 400:
                                counter_available = True
                        except Exception:
                            pass

            if data.get("primary_status") != my_primary_status:
                return False
            if data.get("backup_status") != my_backup_status:
                return False
            if data.get("counter_supports_operator") != counter_available:
                return False
            expected = json.loads(self._derive_readjudication_decision(my_primary_status, my_backup_status, counter_available, orig_sev))
            for field in ["ruling", "event_status", "severity", "coverage_trigger", "responsibility", "evidence_quality"]:
                if data.get(field) != expected.get(field):
                    return False
            return True

        result_json = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        result = json.loads(result_json)

        ruling = result.get("ruling", "UPHOLD")
        self.incident_readjudication_hash[incident_id] = result_json[:200]

        new_sev = self._severity_value(result.get("severity", "NONE"))
        coverage_trigger = int(result.get("coverage_trigger", 0))
        self.incident_event_status[incident_id] = self._event_status_value(result.get("event_status", "INSUFFICIENT_EVIDENCE"))
        self.incident_responsibility[incident_id] = self._responsibility_value(result.get("responsibility", "UNKNOWN"))
        self.incident_evidence_quality[incident_id] = result.get("evidence_quality", "")
        self.incident_summary[incident_id] = result.get("readjudication_summary", "")

        if ruling == "OVERTURN":
            self.incident_severity[incident_id] = SEV_NONE
            self.incident_slash_bps[incident_id] = u256(0)
            self.incident_payout_tier[incident_id] = u256(0)
            self.incident_coverage_trigger[incident_id] = u256(0)
            self.incident_status[incident_id] = INC_RECOVERED
            self.incident_end_time[incident_id] = u256(self._now())

            self.commitment_active_incident[cid] = u256(0)
            self.commitment_consecutive_failures[cid] = u256(0)
            self.commitment_status[cid] = C_ACTIVE
        else:
            self.incident_severity[incident_id] = new_sev
            new_slash = self._get_slash_bps_for_severity(cid, new_sev)
            self.incident_slash_bps[incident_id] = u256(new_slash)
            self.incident_payout_tier[incident_id] = new_sev
            self.incident_coverage_trigger[incident_id] = u256(coverage_trigger)
            self.incident_status[incident_id] = INC_FINAL

    @gl.public.write
    def finalize_provisional_verdict(self, incident_id: u256) -> None:
        inc_status = int(self.incident_status.get(incident_id) or u256(0))
        if inc_status != int(INC_CHALLENGE_WINDOW) and inc_status != int(INC_PROVISIONAL_VERDICT):
            raise gl.vm.UserError("NOT_PROVISIONAL")

        if inc_status == int(INC_CHALLENGE_WINDOW):
            challenge_window = int(self.commitment_challenge_window.get(
                self.incident_commitment[incident_id]
            ) or u256(0))
            start = int(self.incident_start_time.get(incident_id) or u256(0))
            now = self._now()
            if challenge_window > 0 and (now - start) < challenge_window:
                raise gl.vm.UserError("CHALLENGE_WINDOW_OPEN")

        self.incident_status[incident_id] = INC_FINAL

    @gl.public.write
    def finalize_incident(self, incident_id: u256) -> None:
        inc_status = int(self.incident_status.get(incident_id) or u256(0))
        if inc_status != int(INC_FINAL):
            raise gl.vm.UserError("NOT_FINAL")

        cid = self.incident_commitment[incident_id]
        severity = int(self.incident_severity.get(incident_id) or u256(0))
        slash_bps = int(self.incident_slash_bps.get(incident_id) or u256(0))
        coverage_trigger = int(self.incident_coverage_trigger.get(incident_id) or u256(0))
        payout_tier = self.incident_payout_tier.get(incident_id) or u256(0)

        bond = int(self.commitment_bond.get(cid) or u256(0))
        already_slashed = int(self.commitment_bond_slashed.get(cid) or u256(0))
        remaining_bond = bond - already_slashed

        max_cum_bps = int(self.commitment_max_cumulative_slash_bps.get(cid) or u256(BPS_MAX))
        max_cum_slash = (bond * max_cum_bps) // BPS_MAX
        room = max_cum_slash - already_slashed
        if room < 0:
            room = 0

        slash_amount = (remaining_bond * slash_bps) // BPS_MAX
        slash_amount = min(slash_amount, room)
        slash_amount = min(slash_amount, remaining_bond)

        self.incident_slash_amount[incident_id] = u256(slash_amount)
        self.commitment_bond_slashed[cid] = u256(already_slashed + slash_amount)

        if remaining_bond - slash_amount < int(self.commitment_min_bond.get(cid) or u256(0)):
            self.commitment_status[cid] = C_SUSPENDED
        elif int(self._get_commitment_status(cid)) == int(C_INCIDENT_OPEN):
            self.commitment_status[cid] = C_ACTIVE

        now = self._now()
        self.incident_end_time[incident_id] = u256(now)
        start = int(self.incident_start_time.get(incident_id) or u256(0))
        self.incident_duration[incident_id] = u256(now - start)
        self.incident_finalized_at[incident_id] = u256(now)

        if coverage_trigger > 0 and severity > 0:
            tier_bps = self._get_payout_tier_bps(cid, payout_tier)
            policy_ids = self._get_json_array(self.commitment_policy_ids, cid)

            total_payouts = 0
            for pid_int in policy_ids:
                pid = u256(pid_int)
                pol_status = int(self.policy_status.get(pid) or u256(0))
                pol_start = int(self.policy_start.get(pid) or u256(0))
                pol_end = int(self.policy_end.get(pid) or u256(0))
                waiting = int(self.commitment_waiting_period.get(cid) or u256(0))
                inc_start = int(self.incident_start_time.get(incident_id) or u256(0))
                waiting_complete_at_incident = inc_start >= pol_start + waiting

                if pol_status == int(POL_PENDING_WAIT) and waiting_complete_at_incident:
                    apc = int(self.commitment_active_policy_count.get(cid) or u256(0))
                    self.commitment_active_policy_count[cid] = u256(apc + 1)
                    pol_status = int(POL_ACTIVE)

                if pol_status != int(POL_ACTIVE) and pol_status != int(POL_INCIDENT_LOCKED):
                    continue
                if not waiting_complete_at_incident:
                    continue
                if inc_start > pol_end:
                    continue

                limit = int(self.policy_limit.get(pid) or u256(0))
                deductible = int(self.policy_deductible.get(pid) or u256(0))

                gross_payout = (limit * tier_bps) // BPS_MAX
                net_payout = max(0, gross_payout - deductible)
                net_payout = min(net_payout, limit)

                if net_payout > 0:
                    self.policy_claimable[pid] = u256(net_payout)
                    self.policy_status[pid] = POL_PAYOUT_READY
                    self.policy_payout_tier[pid] = payout_tier
                    self.policy_incident_id[pid] = incident_id
                    total_payouts += net_payout

            self.vault_pending_claims[cid] = u256(
                int(self.vault_pending_claims.get(cid) or u256(0)) + total_payouts
            )

        self.incident_status[incident_id] = INC_SETTLEMENT_READY
        self.commitment_active_incident[cid] = u256(0)

    # -- Resolver (minimal) --

    @gl.public.write
    def accept_resolver_assignment(self, incident_id: u256) -> None:
        inc_status = int(self.incident_status.get(incident_id) or u256(0))
        if inc_status != int(INC_RESOLVER_PENDING):
            raise gl.vm.UserError("NOT_RESOLVER_PENDING")

    @gl.public.write
    def declare_resolver_conflict(self, incident_id: u256) -> None:
        inc_status = int(self.incident_status.get(incident_id) or u256(0))
        if inc_status != int(INC_RESOLVER_PENDING):
            raise gl.vm.UserError("NOT_RESOLVER_PENDING")

    @gl.public.write
    def submit_resolver_ruling(self, incident_id: u256, ruling: str, severity: str) -> None:
        inc_status = int(self.incident_status.get(incident_id) or u256(0))
        if inc_status != int(INC_RESOLVER_PENDING):
            raise gl.vm.UserError("NOT_RESOLVER_PENDING")

        cid = self.incident_commitment[incident_id]
        operator = self.commitment_operator[cid]
        if gl.message.sender_address == operator:
            raise gl.vm.UserError("OPERATOR_CANNOT_RESOLVE")

        sev_map = {"NONE": SEV_NONE, "WARNING": SEV_WARNING, "MINOR": SEV_MINOR, "MATERIAL": SEV_MATERIAL, "CRITICAL": SEV_CRITICAL}
        new_sev = sev_map.get(severity, SEV_NONE)

        valid_rulings = ["UPHOLD", "REDUCE_SEVERITY", "INCREASE_WITHIN_POLICY", "OVERTURN", "MARK_SOURCE_FAILURE", "APPLY_SHARED_RESPONSIBILITY"]
        if ruling not in valid_rulings:
            raise gl.vm.UserError("INVALID_RULING")

        if ruling == "OVERTURN":
            self.incident_severity[incident_id] = SEV_NONE
            self.incident_slash_bps[incident_id] = u256(0)
            self.incident_coverage_trigger[incident_id] = u256(0)
        else:
            self.incident_severity[incident_id] = new_sev
            new_slash = self._get_slash_bps_for_severity(cid, new_sev)
            self.incident_slash_bps[incident_id] = u256(new_slash)

        self.incident_status[incident_id] = INC_FINAL

    # ==============================================
    #  ADMIN
    # ==============================================

    @gl.public.write
    def set_paused(self, paused: bool) -> None:
        self._require_admin()
        self.paused = paused

    @gl.public.write
    def withdraw_protocol_treasury(self, amount: u256) -> None:
        self._require_admin()
        treasury = int(self.protocol_treasury)
        if int(amount) > treasury:
            raise gl.vm.UserError("INSUFFICIENT_TREASURY")
        self.protocol_treasury = u256(treasury - int(amount))
        gl.get_contract_at(self.admin).emit_transfer(value=amount)

    # ==============================================
    #  READ METHODS
    # ==============================================

    @gl.public.view
    def get_commitment(self, commitment_id: u256) -> str:
        op = self.commitment_operator.get(commitment_id)
        if op is None:
            return "{}"
        return json.dumps({
            "id": int(commitment_id),
            "operator": op.as_hex,
            "status": int(self.commitment_status.get(commitment_id) or u256(0)),
            "bond": int(self.commitment_bond.get(commitment_id) or u256(0)),
            "bond_slashed": int(self.commitment_bond_slashed.get(commitment_id) or u256(0)),
            "min_bond": int(self.commitment_min_bond.get(commitment_id) or u256(0)),
            "service_name": self.commitment_service_name.get(commitment_id) or "",
            "description": self.commitment_description.get(commitment_id) or "",
            "template": int(self.commitment_template.get(commitment_id) or u256(0)),
            "target_url": self.commitment_target_url.get(commitment_id) or "",
            "observation_interval": int(self.commitment_observation_interval.get(commitment_id) or u256(0)),
            "grace_period": int(self.commitment_grace_period.get(commitment_id) or u256(0)),
            "failure_threshold": int(self.commitment_failure_threshold.get(commitment_id) or u256(0)),
            "consecutive_failures": int(self.commitment_consecutive_failures.get(commitment_id) or u256(0)),
            "incident_count": int(self.commitment_incident_count.get(commitment_id) or u256(0)),
            "active_incident": int(self.commitment_active_incident.get(commitment_id) or u256(0)),
            "version": int(self.commitment_version.get(commitment_id) or u256(0)),
            "policy_count": int(self.commitment_policy_count.get(commitment_id) or u256(0)),
            "active_policy_count": int(self.commitment_active_policy_count.get(commitment_id) or u256(0)),
        })

    @gl.public.view
    def get_commitment_policy(self, commitment_id: u256) -> str:
        return json.dumps({
            "slash_ladder": self.commitment_slash_ladder.get(commitment_id) or "{}",
            "payout_tiers": self.commitment_payout_tiers.get(commitment_id) or "{}",
            "max_policy_limit": int(self.commitment_max_policy_limit.get(commitment_id) or u256(0)),
            "min_policy_limit": int(self.commitment_min_policy_limit.get(commitment_id) or u256(0)),
            "max_policy_duration": int(self.commitment_max_policy_duration.get(commitment_id) or u256(0)),
            "min_policy_duration": int(self.commitment_min_policy_duration.get(commitment_id) or u256(0)),
            "base_premium_bps": int(self.commitment_base_premium_bps.get(commitment_id) or u256(0)),
            "deductible_bps": int(self.commitment_deductible_bps.get(commitment_id) or u256(0)),
            "waiting_period": int(self.commitment_waiting_period.get(commitment_id) or u256(0)),
            "challenge_window": int(self.commitment_challenge_window.get(commitment_id) or u256(0)),
            "max_cumulative_slash_bps": int(self.commitment_max_cumulative_slash_bps.get(commitment_id) or u256(0)),
        })

    @gl.public.view
    def get_capital_state(self, commitment_id: u256) -> str:
        gross = int(self.vault_gross_capital.get(commitment_id) or u256(0))
        reserved = int(self.vault_reserved_capital.get(commitment_id) or u256(0))
        pending = int(self.vault_pending_claims.get(commitment_id) or u256(0))
        losses = int(self.vault_realised_losses.get(commitment_id) or u256(0))
        earned = int(self.vault_earned_premium.get(commitment_id) or u256(0))
        total_shares = int(self.vault_total_shares.get(commitment_id) or u256(0))
        free = self._free_capital(commitment_id)
        capacity = self._available_coverage_capacity(commitment_id)

        return json.dumps({
            "gross_capital": gross,
            "reserved_capital": reserved,
            "free_capital": free,
            "pending_claims": pending,
            "realised_losses": losses,
            "earned_premium": earned,
            "total_shares": total_shares,
            "available_capacity": capacity,
        })

    @gl.public.view
    def get_policy(self, policy_id: u256) -> str:
        holder = self.policy_holder.get(policy_id)
        if holder is None:
            return "{}"
        return json.dumps({
            "id": int(policy_id),
            "commitment_id": int(self.policy_commitment.get(policy_id) or u256(0)),
            "holder": holder.as_hex,
            "limit": int(self.policy_limit.get(policy_id) or u256(0)),
            "premium_paid": int(self.policy_premium_paid.get(policy_id) or u256(0)),
            "start": int(self.policy_start.get(policy_id) or u256(0)),
            "end": int(self.policy_end.get(policy_id) or u256(0)),
            "status": int(self.policy_status.get(policy_id) or u256(0)),
            "claimable": int(self.policy_claimable.get(policy_id) or u256(0)),
            "claimed": int(self.policy_claimed.get(policy_id) or u256(0)),
            "deductible": int(self.policy_deductible.get(policy_id) or u256(0)),
            "payout_tier": int(self.policy_payout_tier.get(policy_id) or u256(0)),
            "incident_id": int(self.policy_incident_id.get(policy_id) or u256(0)),
        })

    @gl.public.view
    def get_incident(self, incident_id: u256) -> str:
        cid = self.incident_commitment.get(incident_id)
        if cid is None:
            return "{}"
        return json.dumps({
            "id": int(incident_id),
            "commitment_id": int(cid),
            "status": int(self.incident_status.get(incident_id) or u256(0)),
            "severity": int(self.incident_severity.get(incident_id) or u256(0)),
            "event_status": int(self.incident_event_status.get(incident_id) or u256(0)),
            "responsibility": int(self.incident_responsibility.get(incident_id) or u256(0)),
            "slash_bps": int(self.incident_slash_bps.get(incident_id) or u256(0)),
            "slash_amount": int(self.incident_slash_amount.get(incident_id) or u256(0)),
            "payout_tier": int(self.incident_payout_tier.get(incident_id) or u256(0)),
            "coverage_trigger": int(self.incident_coverage_trigger.get(incident_id) or u256(0)),
            "start_time": int(self.incident_start_time.get(incident_id) or u256(0)),
            "end_time": int(self.incident_end_time.get(incident_id) or u256(0)),
            "duration": int(self.incident_duration.get(incident_id) or u256(0)),
            "summary": self.incident_summary.get(incident_id) or "",
        })

    @gl.public.view
    def get_observation(self, observation_id: u256) -> str:
        cid = self.observation_commitment.get(observation_id)
        if cid is None:
            return "{}"
        return json.dumps({
            "id": int(observation_id),
            "commitment_id": int(cid),
            "status": int(self.observation_status.get(observation_id) or u256(0)),
            "window_start": int(self.observation_window_start.get(observation_id) or u256(0)),
            "window_end": int(self.observation_window_end.get(observation_id) or u256(0)),
            "result_hash": self.observation_result_hash.get(observation_id) or "",
            "triggerer": (self.observation_triggerer.get(observation_id) or gl.message.sender_address).as_hex,
        })

    @gl.public.view
    def get_incident_evidence_summary(self, incident_id: u256) -> str:
        return json.dumps({
            "source_hash": self.incident_source_hash.get(incident_id) or "",
            "evidence_quality": self.incident_evidence_quality.get(incident_id) or "",
            "counter_evidence": self.incident_counter_evidence_urls.get(incident_id) or "",
            "readjudication_hash": self.incident_readjudication_hash.get(incident_id) or "",
        })

    @gl.public.view
    def get_incident_history(self, commitment_id: u256) -> str:
        return self.commitment_incident_ids.get(commitment_id) or "[]"

    @gl.public.view
    def get_policy_eligibility(self, policy_id: u256) -> str:
        status = int(self.policy_status.get(policy_id) or u256(0))
        claimable = int(self.policy_claimable.get(policy_id) or u256(0))
        claimed = int(self.policy_claimed.get(policy_id) or u256(0))
        cid = self.policy_commitment.get(policy_id) or u256(0)
        now = self._now()
        start = int(self.policy_start.get(policy_id) or u256(0))
        waiting = int(self.commitment_waiting_period.get(cid) or u256(0))
        activation_time = start + waiting
        return json.dumps({
            "status": status,
            "claimable": claimable,
            "claimed": claimed,
            "can_claim": status == int(POL_PAYOUT_READY) and claimable > claimed,
            "activation_time": activation_time,
            "waiting_remaining": max(0, activation_time - now) if status == int(POL_PENDING_WAIT) else 0,
            "can_activate": status == int(POL_PENDING_WAIT) and now >= activation_time,
        })

    @gl.public.view
    def get_claimable_payout(self, policy_id: u256) -> u256:
        claimable = int(self.policy_claimable.get(policy_id) or u256(0))
        claimed = int(self.policy_claimed.get(policy_id) or u256(0))
        return u256(max(0, claimable - claimed))

    @gl.public.view
    def get_operator_positions(self, operator: Address) -> str:
        results = []
        for i in range(1, int(self.next_commitment_id)):
            cid = u256(i)
            op = self.commitment_operator.get(cid)
            if op is not None and op == operator:
                results.append(i)
        return json.dumps(results)

    @gl.public.view
    def get_underwriter_position(self, commitment_id: u256, underwriter: Address) -> str:
        key = self._uw_key(commitment_id, underwriter)
        shares = int(self.underwriter_shares.get(key) or u256(0))
        deposited = int(self.underwriter_deposited.get(key) or u256(0))
        wd_status = int(self.underwriter_withdrawal_status.get(key) or u256(0))
        wd_shares = int(self.underwriter_withdrawal_shares.get(key) or u256(0))
        premium_claimed = int(self.underwriter_premium_claimed.get(key) or u256(0))

        total_shares = int(self.vault_total_shares.get(commitment_id) or u256(0))
        gross = int(self.vault_gross_capital.get(commitment_id) or u256(0))
        current_value = (shares * gross) // total_shares if total_shares > 0 else 0

        return json.dumps({
            "shares": shares,
            "deposited": deposited,
            "current_value": current_value,
            "withdrawal_status": wd_status,
            "withdrawal_shares": wd_shares,
            "withdrawal_executable": wd_status == int(WD_QUEUED) or wd_status == int(WD_EXECUTABLE),
            "premium_claimed": premium_claimed,
        })

    @gl.public.view
    def get_holder_policies(self, holder: Address) -> str:
        key = self._holder_key(holder)
        return self.holder_policy_ids.get(key) or "[]"

    @gl.public.view
    def get_due_observations(self) -> str:
        now = self._now()
        due = []
        for i in range(1, int(self.next_commitment_id)):
            cid = u256(i)
            status = int(self.commitment_status.get(cid) or u256(0))
            if status != int(C_ACTIVE) and status != int(C_WATCH) and status != int(C_INCIDENT_OPEN):
                continue
            last_obs = int(self.commitment_last_observation_time.get(cid) or u256(0))
            interval = int(self.commitment_observation_interval.get(cid) or u256(0))
            if interval == 0:
                continue
            if last_obs == 0 or (now - last_obs) >= interval:
                due.append(i)
        return json.dumps(due)

    @gl.public.view
    def get_active_incidents(self) -> str:
        active = []
        for i in range(1, int(self.next_incident_id)):
            inc_id = u256(i)
            status = int(self.incident_status.get(inc_id) or u256(0))
            if status not in [int(INC_SETTLED), int(INC_RECOVERED), int(INC_SETTLEMENT_READY)]:
                cid = self.incident_commitment.get(inc_id)
                if cid is not None:
                    active.append(i)
        return json.dumps(active)

    @gl.public.view
    def get_system_counts(self) -> str:
        return json.dumps({
            "commitments": int(self.next_commitment_id) - 1,
            "policies": int(self.next_policy_id) - 1,
            "incidents": int(self.next_incident_id) - 1,
            "observations": int(self.next_observation_id) - 1,
            "protocol_treasury": int(self.protocol_treasury),
            "paused": self.paused,
        })

    @gl.public.view
    def get_contract_balance(self) -> u256:
        return self.balance

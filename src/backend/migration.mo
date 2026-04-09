import Map "mo:core/Map";

module {
  // ── Old types (copied from .old/src/backend/main.mo) ──────────────────────

  type OldProvider = {
    id : Text;
    name : Text;
    lat : Float;
    lng : Float;
    isLive : Bool;
    lastVerified : Int;
    providerType : Text;
    is_verified : Bool;
    is_active : Bool;
    inventory : Text;
    reputationScore : Nat;
  };

  type OldHandoff = {
    zipCode : Text;
    timestamp : Int;
    tokenId : Text;
  };

  type OldHandoffToken = {
    token : Text;
    zipCode : Text;
    createdAt : Int;
    used : Bool;
  };

  type OldRiskPacket = {
    provider_id : Text;
    data_source : Text;
    risk_score : Nat;
    last_update_time : Nat;
    status : Bool;
  };

  type OldRiskPacketHistory = {
    packets : [OldRiskPacket];
    current_status : Bool;
    latest_risk_score : Nat;
    latest_update_time : Nat;
  };

  // Old Helper (6 fields)
  type OldHelper = {
    id : Text;
    firstName : Text;
    zip : Text;
    phone : Text;
    note : Text;
    createdAt : Int;
  };

  // New Helper (10 fields)
  type NewHelper = {
    id : Text;
    firstName : Text;
    lastName : Text;
    email : Text;
    zip : Text;
    phone : Text;
    helpType : Text;
    consent : Bool;
    note : Text;
    createdAt : Int;
  };

  // ── Old actor stable state ────────────────────────────────────────────────
  // Includes both the classical-persistence staging arrays AND the Maps,
  // because both are stable fields in the old actor.
  type OldActor = {
    // classical staging arrays (will be dropped — data is in the Maps)
    var providerEntries : [(Text, OldProvider)];
    var handoffEntries : [(Text, OldHandoff)];
    var tokenEntries : [(Text, OldHandoffToken)];
    var zipCountEntries : [(Text, Nat)];
    var riskPacketEntries : [(Text, OldRiskPacketHistory)];
    var helperEntries : [(Text, OldHelper)];
    // Maps (these carry the live data in enhanced orthogonal persistence)
    providers : Map.Map<Text, OldProvider>;
    handoffs : Map.Map<Text, OldHandoff>;
    tokens : Map.Map<Text, OldHandoffToken>;
    zipCounts : Map.Map<Text, Nat>;
    riskPackets : Map.Map<Text, OldRiskPacketHistory>;
    helpers : Map.Map<Text, OldHelper>;
  };

  // ── New actor stable state ────────────────────────────────────────────────
  // Only the helpers Map needs transformation; the others pass through.
  type NewActor = {
    providers : Map.Map<Text, OldProvider>;
    handoffs : Map.Map<Text, OldHandoff>;
    tokens : Map.Map<Text, OldHandoffToken>;
    zipCounts : Map.Map<Text, Nat>;
    riskPackets : Map.Map<Text, OldRiskPacketHistory>;
    helpers : Map.Map<Text, NewHelper>;
  };

  public func run(old : OldActor) : NewActor {
    // Migrate helpers Map: add default values for new fields
    let newHelpers = old.helpers.map<Text, OldHelper, NewHelper>(
      func(_k, h) {
        { h with lastName = ""; email = ""; helpType = "General volunteer"; consent = true };
      }
    );
    {
      providers = old.providers;
      handoffs = old.handoffs;
      tokens = old.tokens;
      zipCounts = old.zipCounts;
      riskPackets = old.riskPackets;
      helpers = newHelpers;
    };
  };
};

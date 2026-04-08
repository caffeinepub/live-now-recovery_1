import Map "mo:core/Map";

module {
  // Provider type — 11 fields (current deployed schema)
  type Provider = {
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

  type Handoff = {
    zipCode : Text;
    timestamp : Int;
    tokenId : Text;
  };

  type HandoffToken = {
    token : Text;
    zipCode : Text;
    createdAt : Int;
    used : Bool;
  };

  type RiskPacket = {
    provider_id : Text;
    data_source : Text;
    risk_score : Nat;
    last_update_time : Nat;
    status : Bool;
  };

  type RiskPacketHistory = {
    packets : [RiskPacket];
    current_status : Bool;
    latest_risk_score : Nat;
    latest_update_time : Nat;
  };

  type Helper = {
    id : Text;
    firstName : Text;
    zip : Text;
    phone : Text;
    note : Text;
    createdAt : Int;
  };

  type UserProfile = {
    name : Text;
  };

  type OldActor = {
    var providerEntries : [(Text, Provider)];
    var handoffEntries : [(Text, Handoff)];
    var tokenEntries : [(Text, HandoffToken)];
    var zipCountEntries : [(Text, Nat)];
    var riskPacketEntries : [(Text, RiskPacketHistory)];
    var helperEntries : [(Text, Helper)];
    var tokenNonce : Nat;
    var adminPrincipals : [Principal];
    providers : Map.Map<Text, Provider>;
    handoffs : Map.Map<Text, Handoff>;
    tokens : Map.Map<Text, HandoffToken>;
    zipCounts : Map.Map<Text, Nat>;
    riskPackets : Map.Map<Text, RiskPacketHistory>;
    userProfiles : Map.Map<Principal, UserProfile>;
    helpers : Map.Map<Text, Helper>;
  };

  type NewActor = {
    var providerEntries : [(Text, Provider)];
    var handoffEntries : [(Text, Handoff)];
    var tokenEntries : [(Text, HandoffToken)];
    var zipCountEntries : [(Text, Nat)];
    var riskPacketEntries : [(Text, RiskPacketHistory)];
    var helperEntries : [(Text, Helper)];
    var tokenNonce : Nat;
    providers : Map.Map<Text, Provider>;
    handoffs : Map.Map<Text, Handoff>;
    tokens : Map.Map<Text, HandoffToken>;
    zipCounts : Map.Map<Text, Nat>;
    riskPackets : Map.Map<Text, RiskPacketHistory>;
    userProfiles : Map.Map<Principal, UserProfile>;
    helpers : Map.Map<Text, Helper>;
  };

  public func run(old : OldActor) : NewActor {
    // Pass-through migration — schema is already at 11 fields.
    // adminPrincipals is consumed and intentionally dropped (replaced by accessControlState).
    {
      var providerEntries = old.providerEntries;
      var handoffEntries = old.handoffEntries;
      var tokenEntries = old.tokenEntries;
      var zipCountEntries = old.zipCountEntries;
      var riskPacketEntries = old.riskPacketEntries;
      var helperEntries = old.helperEntries;
      var tokenNonce = old.tokenNonce;
      providers = old.providers;
      handoffs = old.handoffs;
      tokens = old.tokens;
      zipCounts = old.zipCounts;
      riskPackets = old.riskPackets;
      userProfiles = old.userProfiles;
      helpers = old.helpers;
    };
  };
};

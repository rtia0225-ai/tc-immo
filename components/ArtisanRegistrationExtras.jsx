"use client";

import { useState } from "react";
import TradeAndServices from "@/components/TradeAndServices";
import InterviewSlotPicker from "@/components/InterviewSlotPicker";

export default function ArtisanRegistrationExtras({ interviewSlots }) {
  const [trade, setTrade] = useState("");
  const requiresInterview = trade && trade !== "Maçonnerie";

  return (
    <>
      <TradeAndServices onTradeChange={setTrade} />
      {requiresInterview && <InterviewSlotPicker slots={interviewSlots} />}
    </>
  );
}

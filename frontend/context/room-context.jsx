import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
} from "react";

const RoomContext = createContext();

const roomReducer = (state, action) => {
  switch (action.type) {
    case "ADD_PARTICIPANT":
      // Only add if participant doesn't exist
      if (state.participants[action.payload.id]) {
        return state;
      }
      return {
        ...state,
        participants: {
          ...state.participants,
          [action.payload.id]: action.payload,
        },
      };
    case "REMOVE_PARTICIPANT":
      const { [action.payload]: removed, ...remainingParticipants } =
        state.participants;
      return {
        ...state,
        participants: remainingParticipants,
      };
    case "UPDATE_PARTICIPANT":
      // Only update if the values actually changed
      const currentParticipant = state.participants[action.payload.id];
      if (!currentParticipant) return state;

      const hasChanges = Object.entries(action.payload.updates).some(
        ([key, value]) => currentParticipant[key] !== value
      );

      if (!hasChanges) return state;

      return {
        ...state,
        participants: {
          ...state.participants,
          [action.payload.id]: {
            ...currentParticipant,
            ...action.payload.updates,
          },
        },
      };
    case "KICK_PARTICIPANT":
      if (state.kickedParticipants.includes(action.payload)) {
        return state;
      }
      return {
        ...state,
        kickedParticipants: [...state.kickedParticipants, action.payload],
      };
    default:
      return state;
  }
};

export const RoomProvider = ({ children, initialState }) => {
  const [state, dispatch] = useReducer(roomReducer, initialState);

  const addParticipant = useCallback((participant) => {
    dispatch({ type: "ADD_PARTICIPANT", payload: participant });
  }, []);

  const removeParticipant = useCallback((participantId) => {
    dispatch({ type: "REMOVE_PARTICIPANT", payload: participantId });
  }, []);

  const updateParticipant = useCallback((participantId, updates) => {
    dispatch({
      type: "UPDATE_PARTICIPANT",
      payload: { id: participantId, updates },
    });
  }, []);

  const kickParticipant = useCallback((participantId) => {
    dispatch({ type: "KICK_PARTICIPANT", payload: participantId });
  }, []);

  const value = {
    state,
    addParticipant,
    removeParticipant,
    updateParticipant,
    kickParticipant,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoom must be used within a RoomProvider");
  }
  return context;
};

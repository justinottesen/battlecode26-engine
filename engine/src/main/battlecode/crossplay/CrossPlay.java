package battlecode.crossplay;

import java.util.ArrayList;
import org.json.*;

import battlecode.common.*;

public class CrossPlay {
    ArrayList<Object> objects;

    public CrossPlay() {
        this.objects = new ArrayList<>();
    }

    public int getNextObjectId() {
        int id = this.objects.size();
        this.objects.add(null);
        return id;
    }

    public void processMessages(JSONArray json) {
        System.out.println("Starting cross-play message processing...");

        for (int i = 0; i < json.length(); i++) {
            JSONObject messageJson = json.getJSONObject(i);
            CrossPlayMessage message = CrossPlayMessage.fromJson(messageJson, getNextObjectId());
            run(message);
        }
    }

    @SuppressWarnings("unchecked")
    private <T> T getObject(CrossPlayObject obj) {
        Object rawObj = this.objects.get(obj.objectId);

        try {
            return (T) rawObj;
        } catch (ClassCastException e) {
            throw new CrossPlayException("Tried to get object of type " + obj.type + " but it does not match expected type.");
        }
    }

    private void setObject(CrossPlayObject obj, Object value) {
        this.objects.set(obj.objectId, value);
    }

    private CrossPlayObject run(CrossPlayMessage message) {
        CrossPlayObject[] computedParams = new CrossPlayObject[message.params.length];

        for (int i = 0; i < message.params.length; i++) {
            CrossPlayObject param = message.params[i];

            if (param instanceof CrossPlayMessage) {
                CrossPlayObject innerResult = run((CrossPlayMessage) param);
                computedParams[i] = getObject(innerResult);
            } else {
                computedParams[i] = param;
            }
        }

        CrossPlayObject result;
        Object returnValue;

        switch (message.method) {
            case INVALID:
                throw new CrossPlayException("Received invalid cross-play method!");
            // TODO add cases
            case RC_GET_ROUND_NUM:
                RobotController rc = this.<RobotController>getObject(computedParams[0]);
                int roundNum = rc.getRoundNum();
                result = new CrossPlayObject(CrossPlayObjectType.LITERAL, message.objectId);
                returnValue = roundNum;
                break;
            default:
                throw new CrossPlayException("Received unknown cross-play method: " + message.method);
        }
                
        setObject(result, returnValue);
        return result;
    }
}

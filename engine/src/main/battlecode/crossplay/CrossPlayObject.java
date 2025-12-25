package battlecode.crossplay;

public class CrossPlayObject {
    CrossPlayObjectType type;
    int objectId;

    public CrossPlayObject(CrossPlayObjectType type, int objectId) {
        this.type = type;
        this.objectId = objectId;
    }

    @Override
    public String toString() {
        return "CrossPlayObject(type=" + type + ", objectId=" + objectId + ")";
    }
}

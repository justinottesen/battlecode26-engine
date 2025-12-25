package battlecode.crossplay;

public enum CrossPlayObjectType {
    INVALID,
    CALL,
    LITERAL,
    DIRECTION,
    MAP_LOCATION,
    MESSAGE,
    ROBOT_CONTROLLER,
    ROBOT_INFO,
    TEAM,
    // TODO add more types
    ;

    public static final CrossPlayObjectType[] values = values();
}

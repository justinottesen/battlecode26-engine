package battlecode.common;

/**
 * Enumerates possible traps that can be built.
 */

public enum TrapType {

    /**
     * Traps enemy rats
     */
    RAT_TRAP(30, 50, 20, 15, 0, 25, 2),

    /**
     * Traps the cat
     */
    CAT_TRAP(10, 100, 20, 10, 0, 10, 2),

    /**
     * No trap
     */
    NONE(0, 0, 0, 0, 0, 0, 0);

    /**
     * Crumbs cost of each trap
     */
    public final int buildCost;

    /**
     * The damage done if trap triggered by opponent triggering the trap
     */
    public final int damage;

    /**
     * How many turn stun lasts after entering
     */
    public final int stunTime;

    /*
     * action cooldown for trap placement
     */
    public final int actionCooldown;

    /**
     * Amount of cheese that spawns with the rat trap, if there isn't already at least this much cheese on the trap location
     */
    public final int spawnCheeseAmount;

    /**
     * Maximum number of this trap type that a team can have active at once
     */
    public final int maxCount;

    /**
     * The radius within which the trap is triggered
     */
    public final int triggerRadiusSquared;
    

    TrapType(int buildCost, int damage, int stunTime, int actionCooldown, int spawnCheeseAmount, int maxCount, int triggerRadiusSquared) {
        this.buildCost = buildCost;
        this.damage = damage;
        this.stunTime = stunTime;
        this.actionCooldown = actionCooldown;
        this.spawnCheeseAmount = spawnCheeseAmount;
        this.maxCount = maxCount;
        this.triggerRadiusSquared = triggerRadiusSquared;
    }
}

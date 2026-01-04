import sys
sys.path.append("engine/src")

import os
from argparse import ArgumentParser
from subprocess import Popen
DETACHED_PROCESS = 0x00000008

from crossplay_python.runner import RobotRunner
from crossplay_python.crossplay import BYTECODE_LIMIT, CrossPlayLiteral as lit, \
    CrossPlayMessage as mess, CrossPlayMethod as m, CrossPlayObjectType as ot, \
    wait, reset_files, clear_temp_files
from crossplay_python.wrappers import _GAME_METHODS, Team

CROSSPLAY_PYTHON_DIR = "example-bots/src/crossplay_python" # TODO change for scaffold

TEAM_NAMES = {
    Team.A: "A",
    Team.B: "B",
    Team.NEUTRAL: "N"
}

def get_code(bot_name):
    if bot_name is None:
        return None

    path = f"{CROSSPLAY_PYTHON_DIR}/{bot_name}"

    # read all files in this directory into a dictionary
    code = {}

    for filename in os.listdir(path):
        if filename.endswith(".py"):
            with open(os.path.join(path, filename), "r") as f:
                code[filename[:-3]] = f.read()
    
    return code

def get_error_printer(team=None, id=None, round=None):
    def format_print(*args):
        print(f"[{TEAM_NAMES[team]}: #{id}@{round}] ERROR: ", end="")
        print(*args)

    return format_print

def play(team_a=None, team_b=None, debug=False):
    if team_a == "/":
        team_a = None
    if team_b == "/":
        team_b = None

    print(f"Starting cross-play Python runner with teams {team_a} and {team_b}")

    code = {
        Team.A: get_code(team_a),
        Team.B: get_code(team_b),
        Team.NEUTRAL: None
    }

    reset_files()
    
    try:
        while True:
            rc, round, team, id, end = wait(mess(m.START_TURN, []))

            if end:
                print("Game ended")
                break

            if debug:
                print(f"Starting turn. Round {round}, team {TEAM_NAMES[team]}, ID {id}, end {end}")

            runner = RobotRunner(
                code=code[team],
                game_methods=_GAME_METHODS,
                error_method=get_error_printer(team=team, id=id, round=round),
                bytecode_limit=BYTECODE_LIMIT,
                debug=debug)
            
            runner.init_robot()
            runner.run()
            bytecode = runner.bytecode_limit - runner.bytecode
            runner.kill()
            wait(mess(m.END_TURN, [lit(ot.INTEGER, bytecode)]))
    finally:
        clear_temp_files()

def main():
    if sys.version_info.major != 3 or sys.version_info.minor != 12:
        print(f"Error: The Battlecode Python runner requires Python 3.12. Found version {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}.")
        sys.exit(1)

    parser = ArgumentParser()
    parser.add_argument("--teamA", help="Path to team A code file")
    parser.add_argument("--teamB", help="Path to team B code file")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    parser.add_argument("--new-process", action="store_true", help="Start the Python runner in a new process")
    args = parser.parse_args()

    if args.new_process:
        new_args = [sys.executable, __file__,
                    "--teamA", args.teamA if args.teamA else "/",
                    "--teamB", args.teamB if args.teamB else "/"]
        
        if args.debug:
            new_args.append("--debug")

        Popen(new_args, shell=False, stdin=None, stdout=None, stderr=None,
            close_fds=True, creationflags=DETACHED_PROCESS)
    else:
        play(team_a=args.teamA, team_b=args.teamB, debug=args.debug)

if __name__ == "__main__":
    main()

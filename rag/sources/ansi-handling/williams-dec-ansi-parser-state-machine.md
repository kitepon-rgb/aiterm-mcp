---
title: "A parser for DEC's ANSI-compatible video terminals (Paul Williams)"
source_url: "https://vt100.net/emu/dec_ansi_parser"
source_type: spec
fetched: 2026-06-01
topic: ansi-handling
tags: ["vt100", "state-machine", "parser", "csi", "osc", "dcs", "completeness"]
summary: "VTエミュレータ向けのエスケープ/制御シーケンス解析を13状態の状態機械で完全網羅したParに有名な仕様。任意の悪意入力でも実機同等挙動を保証。"
relevance: "生バイトを正しく画面に畳むには何の状態管理が要るかの決定版。strip-ansiの正規表現が取りこぼすエッジ(分割CSI/DCS)を理解し仮想画面を選ぶ根拠。"
chars: 36097
---

1. [VT100.net](../ "Home")
2. [Emulation](./ "Emulation")

# A parser for DEC’s ANSI-compatible video terminals

## Design Aims

This document presents a state machine for a parser for escape and control sequences, suitable
for use in a VT emulator. It is claimed to have two important properties:

* **Completeness** – it specifies the actions and transitions for every incoming
  character for every state of the parser. In particular, it covers the behaviour of the C0 controls (0/0
  to 1/15) and characters 10/0 to 15/15 for every state.

  *Completeness* does not mean that this state diagram contains all the information you need
  to write a terminal emulator! There are no details here of the mapping of character sets or of cursor
  movement behaviour, to name just two examples. However, it does specify how every incoming character affects the parser’s
  state.
* **Correctness** – if you were to feed this parser a stream of characters that
  is random or deliberately *pathological*, it is claimed that this parser will exhibit the same
  visible behaviour as any one of DEC’s 8-bit ANSI-compatible terminals, from VT220 to VT525. A VT100-series parser would be
  simpler still, as the VT100 only supports 7-bit characters.

During the discussion of this design, I will mention some real terminal emulators by name. This is for
comparative purposes only and no criticism is intended of decisions made by the authors or maintainers of
the applications referred to. After all, I am not presenting a product to the world, merely an *ideal
software model* and I am free to ignore efficiency!

In this document, “VT500” is used as shorthand for the VT500 series of terminals, the VT510, VT520 and VT525.

### Why *DEC-compatible*, not just *ANSI-compatible*?

All of DEC’s terminals from the VT100 onward are compatible with ANSI X3.64-1979, “Additional Controls for Use with American National
Standard Code for Information Interchange”, hereafter referred to just as X3.64.
However, X3.64 defines many implementation-dependent features and error conditions *without defining recovery procedures*. A sample of these is
given below; a more detailed treatment appears later.

* Occurrences of characters 00-1F or 7F-FF in an escape sequence or control sequence is an error condition whose
  recovery is not specified.
* For control sequences, the maximum length of parameter string is defined by implementation.
* For control sequences, occurrences of a parameter character after an intermediate character is an error
  condition.

A terminal is a closed
box that doesn’t normally report errors in its input stream to the host, so it must define a recovery
procedure for all the circumstances left undefined by X3.64. DEC defined the recoveries for their
terminals, so emulators should match these exactly[¹](#FOOTMATCH).

## The State Diagram

VT500-Series Parser

image/svg+xml

VT500-Series Parser

Paul Flo Williams <paul@frixxon.co.uk>

http://vt100.net/emu/dec\_ansi\_parser
en

20-2F / collect
3A
30-3F
20-2F / collect
3A,3C-3F
30-39,3B / param3C-3F / collect
40-7E
40-7E
40-7E
58,5E,5F
20-2F / collect
30-7E / esc\_dispatch
30-4F,51-57,59,5A,5C,60-7E / esc\_dispatch
5B
30-39,3B / param3C-3F / collect
3A
30-3F
20-2F / collect
40-7E / csi\_dispatch
5D
50
VT500-Series Parser
Copyright 2002‒2017 Paul Flo Williams

Treatment of codes A0‒FFIn all cases shown here, codesA0‒FF (GR area) are treated identicallyto codes 20‒7F (GL area). Thissymmetry does not extend to the C0and C1 areas.

anywhere

18,1A / execute80-8F,91-97,99,9A / execute9C / (no action)

ground

event 00-17,19,1C-1F / executeevent 20-7F / print

anywhere

1B

escape

entry / clearevent 00-17,19,1C-1F / executeevent 7F / ignore

escape intermediate

event 00-17,19,1C-1F / executeevent 20-2F / collectevent 7F / ignore

anywhere

9B

csi entry

entry / clearevent 00-17,19,1C-1F / executeevent 7F / ignore

40-7E / csi\_dispatch

csi param

event 00-17,19,1C-1F / executeevent 30-39,3B / paramevent 7F / ignore

40-7E / csi\_dispatch

20-2F / collect

3A,3C-3F

csi intermediate

event 00-17,19,1C-1F / executeevent 20-2F / collectevent 7F / ignore

csi ignore

event 00-17,19,1C-1F / executeevent 20-3F,7F / ignore

40-7E

ground

anywhere

90

dcs entry

entry / clearevent 00-17,19,1C-1F / ignoreevent 7F / ignore

dcs param

event 00-17,19,1C-1F / ignoreevent 30-39,3B / paramevent 7F / ignore

dcs intermediate

event 00-17,19,1C-1F / ignoreevent 20-2F / collectevent 7F / ignore

dcs ignore

event 00-17,19,1C-1F,20-7F / ignore

9C

ground

dcs passthrough

entry / hookevent 00-17,19,1C-1F,20-7E / putevent 7F / ignoreexit / unhook

9C

ground

anywhere

9D

osc string
entry / osc\_startevent 00-17,19,1C-1F / ignoreevent 20-7F / osc\_putexit / osc\_end

9C

ground

anywhere

98,9E,9F

sos/pm/apc string
event 00-17,19,1C-1F,20-7F / ignore

9C

ground

The UML State Diagram should be readable to anyone who has seen a picture of a state machine
before, but here are some notes on reading it.

* Rounded boxes are states. A horizontal line separates the name of the state
  from the event list. The event list contains several event/action pairs, as shown below.

  entry / osc\_start
  event 01-17,19,1C-1F / ignore
  event 20-7F / osc\_put
  exit / osc\_end

  The *entry* event happens when a state is first entered. The *events*
  list incoming symbols which cause an action to take place while remaining in that state.
  The action associated with the *exit* event happens when an incoming symbol
  causes a transition from this state to another state (or even back to the same state). When going
  from one state to another, the actions take place in this order:

  1. *exit* action from old state
  2. transition action
  3. *entry* action to new state
* States with grey backgrounds are duplicates of a state described more fully
  somewhere else on the diagram. They are present to prevent too many lines crossing. Transitions shown
  with grey lines serve as reminders that certain events cause a change of state from anywhere.
* All events in this diagram are the hex values of the incoming bytes. Although we are used to presenting
  sequences in the form `ESC [ 3 m` for readability, using hex values instead of ASCII
  characters emphasises that these sequences are not dependent on the character encoding in use.
* Section numbers (e.g. §3.5.6) refer to ANSI X3.64.
* There are no explicit actions shown for incoming codes in the GR area (A0-FF). In all states, these
  codes are treated identically to GL codes 20-7F. This behaviour is suggested in Appendix H of X3.64:

  > In an 8-bit code, the bit
  > combinations of columns 10 to 15
  > (except 10/0 and 15/15) are permitted
  > to represent:
  >
  > + parameters, intermediates, and
  >   finals of a control sequence;
  > + the contents of a control
  >   string;
  > + the operand of a single-shift
  >   character.
  >
  > In these situations, the bit
  > combinations in the range 10/1 to
  > 15/14 have the same meanings as the
  > corresponding bit combinations in
  > the range 2/1 to 7/14.

## State Definitions

ground
:   This is the initial state of the parser, and the state used to consume all characters other than components of
    escape and control sequences.

    GL characters (20 to 7F) are printed. I have included 20 (SP) and 7F (DEL) in this area, although both
    codes have special behaviour. If a 94-character set is mapped into GL, 20 will cause a space to be displayed,
    and 7F will be ignored. When a 96-character set is mapped into GL, both 20 and 7F may cause a character
    to be displayed. Later models of the VT220 included the DEC Multinational Character Set (MCS), which has 94
    characters in its supplemental set (i.e. the characters supplied in addition to ASCII), so terminals only
    claiming VT220 compatibility can always ignore 7F. The VT320 introduced ISO Latin-1, which has 96 characters
    in its supplemental set, so emulators with a VT320 compatibility mode need to treat 7F as a printable character.

escape
:   This state is entered whenever the C0 control ESC is received. This will immediately cancel any
    escape sequence, control sequence or control string in progress. If an escape sequence or control sequence
    was in progress, “cancel” means that the sequence will have no effect, because the final character that
    determines the control function (in conjunction with any intermediates) will not have been received.
    However, the ESC that cancels a control string may occur after the control function has been determined
    and the following string has had some effect on terminal state. For example, some soft characters may already
    have been defined. Cancelling a control string does not undo these effects.

    A control string that started with DCS, OSC, PM or APC is usually terminated by the C1 control ST
    (String Terminator). In a 7-bit environment, ST will be represented by `ESC \` (1B 5C).
    However, receiving the ESC character will “cancel” the control string, so the ST control function that is
    invoked by the arrival of the following “\” is essentially a “no-op” function. Does this point seem like
    pure trivia? Maybe, but I worried for ages about whether the control string recogniser needed a one character
    lookahead in order to know whether `ESC \` was going to terminate it. The actual solution
    became clear when I was using ReGIS on a VT330: sending ESC immediately caused the graphics output cursor
    to disappear from the screen, so I knew that the control string had already finished before the “\” arrived.
    Many of the clues that enabled me to derive this state diagram have been as subtle as that.

escape intermediate
:   This state is entered when an intermediate character arrives in an escape sequence. Escape sequences
    have no parameters, so the control function to be invoked is determined by the intermediate and final
    characters. In this parser there is just one *escape intermediate*, and the parser uses the [*collect*](#ACCOL)
    action to remember intermediate characters as they arrive, for processing by the [*esc\_dispatch*](#ACESCDIS) action
    when the final character arrives. An alternate approach (and the one adopted by xterm) is to have
    multiple copies of this state and choose the next appropriate one as each intermediate character arrives.
    I think that this alternate approach is merely an optimisation; the approach presented here doesn’t require
    any more states if the repertoire of supported control functions increases.

    This state is only split from the [*escape*](#STESC) state because certain escape sequences are the 7-bit
    representations of C1 controls that change the state of the parser. Without these “compatibility sequences”,
    there could just be one escape state to collect intermediates and dispatch the sequence when a final character
    was received.

csi entry
:   This state is entered when the control function CSI is recognised, in 7-bit or 8-bit form. This state
    will only deal with the
    first character of a control sequence, because the characters 3C-3F can only appear as the first character
    of a control sequence, if they appear at all. Strictly speaking, X3.64 says that the entire string is “subject
    to private or experimental interpretation” if the first character is one of 3C-3F, which allows sequences like `CSI ?::<? F`, but Digital’s
    terminals only ever used one private-marker character at a time. As far as I am aware, only characters 3D (=), 3E (>) and 3F (?) were
    used by Digital.

    C0 controls are executed immediately during the recognition of a control sequence. C1 controls will cancel
    the sequence and then be executed. I imagine this treatment of C1 controls is prompted by the consideration that the 7-bit (ESC Fe) and
    8-bit representations of C1 controls should act in the same way. When the first character of the 7-bit representation, ESC,
    is received, it will cancel the control sequence, so the 8-bit representation should do so as well.

csi param
:   This state is entered when a parameter character is recognised in a control sequence. It then
    recognises other parameter characters until an intermediate or final character appears. Further occurrences
    of the private-marker characters 3C-3F or the character 3A, which has no standardised meaning, will cause
    transition to the [*csi ignore*](#STCSIIGN) state.

csi intermediate
:   This state is entered when an intermediate character is recognised in a control sequence. It then
    recognises other intermediate characters until a final character appears. If any more parameter characters
    appear, this is an error condition which will cause a transition to the [*csi ignore*](#STCSIIGN) state.

    Neither X3.64 nor Digital defined any control sequences with more than one intermediate character, although X3.64
    doesn’t place any limit on the possible number.

csi ignore
:   This state is used to consume remaining characters of a control sequence that is still being
    recognised, but has already been disregarded as malformed. This state will only exit when a final character
    is recognised, at which point it transitions to [*ground*](#STGRO) state without dispatching the control
    function. This state may be entered because:

    1. a private-marker character 3C-3F is recognised in any place other than the first character of the control sequence,
    2. the character 3A appears anywhere, or
    3. a parameter character 30-3F occurs after an intermediate character has been recognised.

    C0 controls will still be executed while a control sequence is being ignored.

dcs entry
:   This state is entered when the control function DCS is recognised, in 7-bit or 8-bit form. X3.64 doesn’t define
    any structure for device control strings, but Digital made them appear like control sequences followed by a data
    string, with a form and length dependent on the control function. This state is only used to recognise
    the first character of the control string, mirroring the [*csi entry*](#STCSIENT) state.

    C0 controls other than CAN, SUB and ESC are **not** executed while recognising the first part of a device control string.

dcs param
:   This state is entered when a parameter character is recognised in a device control string. It then
    recognises other parameter characters until an intermediate or final character appears. Occurrences of the
    private-marker characters 3C-3F or the undefined character 3A will cause a transition to the [*dcs ignore*](#STDCSIGN)
    state.

dcs intermediate
:   This state is entered when an intermediate character is recognised in a device control string. It
    then recognises other intermediate characters until a final character appears. If any more parameter
    characters appear, this is an error condition which will cause a transition to the [*dcs ignore*](#STDCSIGN) state.

dcs passthrough
:   This state is a shortcut for writing state machines for all possible device control strings into the
    main parser. When a final character has been recognised in a device control string, this state will establish
    a channel to a handler for the appropriate control function, and then pass all subsequent characters through
    to this alternate handler, until the data string is terminated (usually by recognising the ST control function).

    This state has an exit action so that the control function handler can be informed when the data string has
    come to an end. This is so that the last soft character in a DECDLD string can be completed when there is no other means
    of knowing that its definition has ended, for example.

dcs ignore
:   This state is used to consume remaining characters of a device control string that is still being
    recognised, but has already been disregarded as malformed. This state will only exit when the control function
    ST is recognised, at which point it transitions to [*ground*](#STGRO) state. This state may be entered because:

    1. a private-marker character 3C-3F is recognised in any place other than the first character of the control string,
    2. the character 3A appears anywhere, or
    3. a parameter character 30-3F occurs after an intermediate character has been recognised.

    These conditions are only errors in the first part of the control string, until a final character has
    been recognised. The data string that follows is not checked by this parser.

osc string
:   This state is entered when the control function OSC (Operating System Command) is recognised.
    On entry it prepares an external parser for OSC strings and passes all printable characters to a handler
    function. C0 controls other than CAN, SUB and ESC are ignored during reception of the control string.

    The only control functions invoked by OSC strings are DECSIN (Set Icon Name) and DECSWT (Set Window Title),
    present on the multisession VT520 and VT525 terminals. Earlier terminals treat OSC in the same way as PM and APC, ignoring the
    entire control string.

sos/pm/apc string
:   The VT500 doesn’t define any function for these control strings, so this state ignores all
    received characters until the control function ST is recognised.

anywhere
:   This isn’t a real state. It is used on the state diagram to show transitions that can occur
    from any state to some other state. These invariant transitions are:

    * On the VT220, VT420 and VT500, the C0 controls CAN and SUB cancel any escape sequence, control sequence or
      control string in progress and return to ground state. SUB will also display the error character, a reversed
      question mark, “␦”. The programmer’s information for the VT320 says that CAN and SUB “no longer” cancel these
      sequences, so there must have been a rethink when the VT420 was being designed.
    * All C1 controls cancel any escape sequence, control sequence or
      control string in progress and are executed. Control functions special to this parser, i.e. DCS, SOS, CSI, OSC, PM and APC, cause
      a transition to their appropriate states. All other C1 control functions (even those with no defined meaning), cause a
      transition to [*ground*](#STGRO) state.

    On terminals earlier than the VT500, there would have been one other invariant action: the C0 control NUL
    was ignored on input to the terminal and would not take part in any processing. Its only purpose was as a
    time-fill character. However, the VT500 defines a control function DECNULM (Null Mode), which allows NUL to
    be passed to an attached printer. So in this parser, NUL is treated the same as other C0 controls.

## Action Definitions

An event may cause one of these actions to occur with or without a change of state.

ignore
:   The character or control is not processed. No observable difference in the terminal’s state would
    occur if the character that caused this action was not present in the input stream. (Therefore, this action can only occur within a state.)

print
:   This action only occurs in [*ground*](#STGRO) state. The current code should be mapped to a glyph
    according to the character set mappings and shift states in effect, and that glyph should be displayed. 20 (SP) and 7F (DEL) have special
    behaviour in later VT series, as described in [*ground*](#STGRO).

execute
:   The C0 or C1 control function should be executed, which may have any one of a variety of effects,
    including changing the cursor position, suspending or resuming communications or changing the shift states in
    effect. There are no parameters to this action.

clear
:   This action causes the current private flag, intermediate characters, final character and parameters to be forgotten. This occurs on entry
    to the [escape](#STESC), [csi entry](#STCSIENT) and [dcs entry](#STDCSENT) states, so that erroneous sequences
    like `CSI 3 ; 1 CSI 2 J` are handled correctly.

collect
:   The private marker or intermediate character should be stored for later use in selecting a control
    function to be executed when a final character arrives. X3.64 doesn’t place any limit on the number of
    intermediate characters allowed before a final character, although it doesn’t define any control sequences
    with more than one. Digital defined escape sequences with two intermediate characters, and
    control sequences and device control strings with one. If more than two intermediate characters arrive, the
    parser can just flag this so that the dispatch can be turned into a null operation.

param
:   This action collects the characters of a parameter string for a control sequence or device control sequence
    and builds a list of parameters. The characters processed by this action are the digits 0-9 (codes 30-39) and
    the semicolon (code 3B). The semicolon separates parameters. There is no limit to the number of characters
    in a parameter string, although a maximum of 16 parameters need be stored. If more than 16 parameters arrive,
    all the extra parameters are silently ignored.

    The VT500 Programmer Information is inconsistent regarding the maximum value that a parameter can take. In
    section 4.3.3.2 of EK-VT520-RM it says that “any parameter greater than 9999 (decimal) is set to 9999 (decimal)”.
    However, in the description of DECSR (Secure Reset), its parameter is allowed to range from 0 to 16383. Because individual
    control functions need to make sure that numeric parameters are within specific limits,
    the supported maximum is not critical, but it must be at least 16383.

    Most control functions support default values for their parameters. The default value for a parameter is
    given by either leaving the parameter blank, or specifying a value of zero. Judging by previous threads on the
    newsgroup comp.terminals, this causes some confusion, with the occasional
    assertion that zero is the default parameter value for control functions. This is not the case: many control
    functions have a default value of 1, one (GSM) has a default value of 100, and some have no default. However,
    in all cases the default value is *represented* by either zero or a blank value.

    In the standard ECMA-48, which can be considered X3.64’s successor[²](#FOOTECMA48),
    there is a distinction between a parameter with an empty value (representing the default value), and one
    that has the value zero. There used to be a mode, ZDM (Zero Default Mode), in which the two cases were treated identically,
    but that is now deprecated in the fifth edition (1991). Although a VT500 parser needs to treat both empty and zero
    parameters as representing the default, it is worth considering future extensions by distinguishing them internally.

esc\_dispatch
:   The final character of an escape sequence has arrived, so determined the control function to be executed
    from the intermediate character(s) and final character, and execute it. The intermediate characters are available
    because [*collect*](#ACCOL) stored them as they arrived.

csi\_dispatch
:   A final character has arrived, so determine the control function to be executed from private marker,
    intermediate character(s) and final character, and execute it, passing in the parameter list. The private marker and intermediate characters are
    available because [*collect*](#ACCOL) stored them as they arrived.

    Digital mostly used private markers to extend the parameters of existing X3.64-defined control functions,
    while keeping a similar meaning. A few examples are shown in the table below.

    | No Private Marker | With Private Marker |
    | --- | --- |
    | SM, Set ANSI Modes | SM, Set Digital Private Modes |
    | ED, Erase in Display | DECSED, Selective Erase in Display |
    | CPR, Cursor Position Report | DECXCPR, Extended Cursor Position Report |

    In the cases above, *csi\_dispatch* needn’t know about the private marker at all, as long as it is
    passed along to the control function when it is executed. However, the VT500 has a single case where
    the use of a private marker selects an entirely different control function (DECSTBM, Set Top and Bottom
    Margins and DECPCTERM, Enter/Exit PCTerm or Scancode Mode), so this action needs to use the private
    marker in its choice. xterm takes the same approach for efficiency, even though it doesn’t
    support DECPCTERM.

    The selected control function will have access to the list of parameters, which it will use some or all
    of. If more parameters are supplied than the control function requires, only the earliest parameters will be
    used and the rest will be ignored. If too few parameters are supplied, default values will be used. If the
    control function has no default values, defaulted parameters will be ignored; this may result in the control
    function having no effect. For example, if the SM (Set Mode)
    control function is invoked with the sequence `CSI 2;0;5 h`, the second parameter will be ignored because
    SM has no default value.

hook
:   This action is invoked when a final character arrives in the first part of a device control string.
    It determines the control function from the private marker, intermediate character(s) and final character,
    and executes it, passing in the parameter list. It also selects a handler function for the rest of the
    characters in the control string. This handler function will be called by the [*put*](#ACPUT) action for every
    character in the control string as it arrives.

    This way of handling device control strings has been selected because it allows the simple plugging-in of
    extra parsers as functionality is added. Support for a fairly simple control string like DECDLD (Downline Load) could be
    added into the main parser if soft characters were required, but the main parser is no place for complicated
    protocols like ReGIS.

put
:   This action passes characters from the data string part of a device control string to a handler that
    has previously been selected by the [*hook*](#ACHOO) action. C0 controls are also passed to the handler.

unhook
:   When a device control string is terminated by ST, CAN, SUB or ESC, this action calls the previously
    selected handler function with an “end of data” parameter. This allows the handler to finish neatly.

osc\_start
:   When the control function OSC (Operating System Command) is recognised, this action initializes an
    external parser (the “OSC Handler”) to handle the characters from the control string. OSC control strings are not structured
    in the same way as device control strings, so there is no choice of parsers.

osc\_put
:   This action passes characters from the control string to the OSC Handler as they arrive. There is
    therefore no need to buffer characters until the end of the control string is recognised.

osc\_end
:   This action is called when the OSC string is terminated by ST, CAN, SUB or ESC, to allow the OSC handler
    to finish neatly.

## What X3.64 Doesn’t Say

As I said above, X3.64 deliberately leaves some decisions to implementers. It doesn’t define recovery
from error conditions, and some limits are implementation dependent. The following sections define
DEC’s method of coping with all of these sections of the standard.

* **X3.64:** §2.2.3 Classes of Bit Combinations

  > Example: The format of an Escape sequence
  > as defined in ANSI X3.41-1974 and used in
  > this standard is:
  >
  > ```
  >      ESC I...I F
  > ```
  >
  > [...]
  >
  > (4) The occurrence of characters in the
  > inclusive ranges of 0/0 to 1/15 and 7/15
  > to 15/15 is an error condition whose
  > recovery is not specified.

  **DEC:** The C0 controls 00-1F are executed, 7F is ignored, C1 controls 80-9F are executed (cancelling the escape
  sequence) and
  GR codes A0-FF are treated as GL codes 20-7F.
* **X3.64:** §3.2.1 Software Control Strings

  > The opening delimiters for the
  > software strings are:
  >
  > |  |  |
  > | --- | --- |
  > | Name | Mnemonic |
  > | Operating System Command | OSC |
  > | Privacy Message | PM |
  > | Application Program Command | APC |
  >
  > The string is terminated by the occurrence
  > of a String Terminator (see 3.2.3). The
  > occurrence of other control characters
  > and/or characters from columns 10 to 15
  > within such a string are error conditions
  > whose recovery is not specified by this
  > standard.

  **DEC:** None of Digital’s terminals define any meaning for received Privacy Message or Application
  Program Command strings. C0 controls, GL characters and GR characters are ignored. C1 controls
  will cancel the sequence.

  The VT500 defines two Operating System Commands, DECSIN (Set Icon Name) and DECSWT (Set Window Title).
  C0 controls are ignored in these sequences. C1 controls will cancel the sequence.
* **X3.64:** §3.2.2 Device Control Strings

  > These strings take
  > the form of the introducer character DCS
  > followed by one or more bit combinations
  > representing the function. These may be
  > characters from columns 2 to 7, excluding
  > 7/15 (2/0 to 7/14)
  >
  > [...]
  >
  > The occurrence of
  > other control characters and/or characters
  > from columns 10 to 15 within such a string
  > are error conditions whose recovery is not
  > specified by this standard.

  **DEC:** On Digital’s terminals, device control strings have structure
  that is not specified by X3.64. The first section of a device control string has the same
  structure as a control sequence, up to what would be the final character of a control
  sequence. At that point, the device function is determined from the intermediate and
  final characters, and the rest of the string has a meaning specific to the selected
  device function. In the first section, C0 controls are ignored. In the second section,
  C0 controls may or may not have a meaning to the device function. If they have no meaning
  for the device function (e.g. when defining soft characters with DECDLD) they will be silently
  ignored. If they have a meaning for the device function (e.g. when in ReGIS mode), they will
  be acted upon.
* **X3.64:** §3.5 Control Sequence Functions

  > The general form of a control sequence
  > function is as follows:
  >
  > ```
  >     CSI P...P I...I F
  > ```
  >
  > [...]
  >
  > (2) P...P is called the “parameter
  > string.” The minimum length is zero, and
  > the maximum length is defined by the
  > implementation. However, all bit
  > combinations are from 3/0 to 3/15
  > inclusive.
  >
  > [...]
  >
  > (5) The occurrence of bit combinations
  > from columns 0 and 1 (0/0 to 1/15), from
  > columns 8 to 15 (8/0 to 15/15), or
  > position 7/15 in control sequences are
  > error conditions whose recovery is not
  > specified by this standard.

  **DEC:** There is no limit to the number of characters in the parameter
  string, but a maximum of 16 parameters will be processed. All parameters beyond the 16th will
  be silently ignored. In a control sequence the C0 controls 00-1F are executed, 7F is ignored, C1 controls 80-9F are executed
  (cancelling the control sequence) and
  GR codes A0-FF are treated as GL codes 20-7F.
* **X3.64:** §3.5.1 Parameter Values

  > The bit combination 3/10 is reserved for
  > future standardization.

  **DEC:** Character 3A (ASCII colon) will cause the control sequence to be ignored,
  though **not** cancelled. All characters up to a valid final character will be collected,
  but then no action will take place.
* **X3.64:** §3.5.5 Selective Parameters

  > The maximum number of
  > parameters in a selective Control Sequence
  > is implementation-defined, as is the order
  > of performance and the effect of
  > conflicting or unusual combinations.

  **DEC:** There can be a maximum of 16 parameters in
  a control sequence. All parameters beyond the 16th will
  be silently ignored. Parameters are processed from first to last, with
  conflicts simply resolved by allowing later parameters to override the
  effects of earlier ones. This means that the sequence `CSI 7;0 m`
  will not set the reverse video attribute, because the parameter ‘7’ is cancelled
  by the ‘0’.
* **X3.64:** §3.5.6 Structure of Control Sequences

  > For both numeric and selective parameters
  > the complete control sequence structure
  > is:
  >
  > CSI P11...P1m 3/11 P21...P2m 3/11 ... 3/11 Pn1...Pnm I...I F
  >
  > If P11 is 3/0 to 3/11, inclusive, the
  > parameter string is interpreted according
  > to the standard format described below.
  >
  > If P11 is 3/12 to 3/15, inclusive, the
  > entire parameter string is subject to
  > private or experimental interpretation.
  >
  > [...]
  >
  > (2) Px1...Pxm is a numeric or selective
  > parameter. Pxy is 3/0 to 3/9 inclusive
  > for standardized parameters. Occurrences
  > of 3/12 to 3/15 inclusive are undefined.
  >
  > [...]
  >
  > NOTE: The occurrence of bit combinations
  > in the following inclusive ranges: 0/0 to
  > 1/15, or 7/15 to 15/15, or the occurrence
  > of a P after an I has been encountered is
  > an error condition whose recovery is not
  > specified by this standard.

  **DEC:** Occurrences of 3C to 3F in positions other than
  the first character of the parameter string cause the entire control sequence
  to be ignored. In a control sequence the C0 controls 00-1F are executed, 7F is ignored, C1 controls 80-9F are executed
  (cancelling the control sequence) and
  GR codes A0-FF are treated as GL codes 20-7F.

## An Implementation

As of 2005, Josh Haberman has implemented this parser in C and placed it in the public domain.
You will also need Ruby to create the parser tables at compile time. It’s on [GitHub](https://github.com/haberman/vtparse).

## Any Questions?

If you have any questions about this document, please send them to me, no matter how trivial you think they are.
Even if the answer is already stated here, it may need clarification (or writing in bigger letters!)
If you try to write the parser for a terminal emulator from this specification and you find you need a leap of logic,
I’ve not done my job properly, and I’d like to hear about it.

## Footnotes

1. It is debatable how far it is necessary to go with making an emulator match the
   error-recovery behaviour of the terminal, for two
   reasons. Firstly, for the practical reason that information on error recovery isn’t contained in DEC’s terminal
   manuals and discovering it means taking detailed and seemingly-endless notes about the terminal’s
   behaviour when certain bizarre sequences are sent to it. (OK, I’ve done that!)

   Secondly, how often would erroneous sequences be sent
   to the terminal anyway? I would answer this by saying that people who write applications for terminals
   don’t always read the manuals and may rely on some observed behaviour of the terminal without realising
   that they are seeing the effects of error recovery. It appears to be common knowledge among emulator
   writers ([and their critics](http://groups.google.com/groups?selm=odhghg2ymj.fsf%40donald.xylogics.com)) that the sequence `CSI 2 LF C` moves
   the cursor two columns right and one row down. How many realise that this behaviour is not specified in
   X3.64, but just happens to have been the error recovery chosen by the designers of the VT100?
   The lesson I take from this is that if you’re going to emulate a real terminal, you should match
   all observable behaviour.
2. With its first edition having been published in 1976, [ECMA-48](http://www.ecma-international.org/publications/standards/Ecma-048.htm) “Control Functions for Coded Character Sets” predates ANSI X3.64
   and has been updated for longer. As ECMA make their standards available free of charge, I find
   it surprising that anyone ever bothered claiming conformance with ANSI X3.64.

Citation: Williams, Paul Flo. “A parser for DEC’s ANSI-compatible video terminals.” *VT100.net*. <https://vt100.net/emu/dec_ansi_parser>

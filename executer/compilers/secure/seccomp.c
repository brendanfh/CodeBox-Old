#include <seccomp.h>
#include <linux/seccomp.h>

void __attribute__((constructor(0))) init()
{
    scmp_filter_ctx ctx;

    ctx = seccomp_init(SCMP_ACT_ALLOW);

    seccomp_rule_add(ctx, SCMP_ACT_KILL, SCMP_SYS(open), 0);
    seccomp_rule_add(ctx, SCMP_ACT_KILL, SCMP_SYS(openat), 0);
    seccomp_rule_add(ctx, SCMP_ACT_KILL, SCMP_SYS(creat), 0);
    seccomp_rule_add(ctx, SCMP_ACT_KILL, SCMP_SYS(mkdir), 0);
    seccomp_rule_add(ctx, SCMP_ACT_KILL, SCMP_SYS(fork), 0);
    seccomp_rule_add(ctx, SCMP_ACT_KILL, SCMP_SYS(clone), 0);
    seccomp_rule_add(ctx, SCMP_ACT_KILL, SCMP_SYS(execve), 0);
    seccomp_rule_add(ctx, SCMP_ACT_KILL, SCMP_SYS(unlink), 0);
    seccomp_rule_add(ctx, SCMP_ACT_KILL, SCMP_SYS(kill), 0);
    seccomp_rule_add(ctx, SCMP_ACT_KILL, SCMP_SYS(socketcall), 0);

    seccomp_load(ctx);
}
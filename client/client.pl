#!/usr/bin/perl

my $host = "http://localhost:8080/";

#--Start game
my $cmd = "curl --silent -L $host"."start";
my $output = `$cmd`;
my $session_id = $output;
$session_id=~s/.*?ID:\s(\w+).*/$1/si;
print STDERR $output,"\n";
while(1) {
    print STDERR "Input:\n";
    my $userInput =  <STDIN>;
    chomp ($userInput);
    print "User typed $userInput\n";
    system("curl $host"."state/$session_id/move/$userInput");
}

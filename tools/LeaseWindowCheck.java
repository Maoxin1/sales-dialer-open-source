import com.mantou.salesdialer.spike.LeaseWindow;
public final class LeaseWindowCheck {
    public static void main(String[] args){
        long[][] rows={{100,100,200,190,3,3,1},{189,100,200,190,3,3,1},{190,100,200,190,3,3,0},{99,100,200,190,3,3,0},{150,100,200,201,3,3,0},{150,100,200,190,4,3,0},{150,100,200,190,-1,-1,0},{100,100,60101,190,3,3,0}};
        for(long[] r:rows)if(LeaseWindow.valid(r[0],r[1],r[2],r[3],(int)r[4],(int)r[5])!=(r[6]==1))throw new AssertionError(java.util.Arrays.toString(r));
        System.out.println("T-CALL-147: 8 elapsed/expiry/boot guard cases passed; no Android runtime or real reboot claimed");
    }
}
